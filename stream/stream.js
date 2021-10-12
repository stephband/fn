
import id      from '../modules/id.js';
import nothing from '../modules/nothing.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/**
Stream()
**/

const properties = {
    consumer:  { writable: true },
    stopables: { writable: true }
};

const producerProperties = {
    push: function input() {
        const length = arguments.length;
        let n = -1;
        while (++n < length) {
            this.consumer.push(arguments[n]);
        }
    },

    stop: function() {
        throw new Error('TODO: Implement stream mouth stop()');
    }
};

function stop(stopable) {
    return stopable.stop ?
        stopable.stop() : 
        stopable() ;
}

function done(stopables) {
    stopables.forEach(stop);
    stopables.length = 0;
}

export default function Stream(start) {
    // Support construction without `new`
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(start);
    }

    const stream = this;

    this.start = function() {
        // Assign result of setup to stream - setup should return undefined or
        // an object with a .push() method ... TODO: decide on this API for real
        const mouth = assign(create(stream), producerProperties);
        assign(stream, start(mouth));
        return this;
    };
}

assign(Stream.prototype, {
    /** 
    .map()
    **/
    map: function(fn) {
        return this.pipe(new Map(fn));
    },

    /** 
    .filter()
    **/
    filter: function(fn) {
        return this.pipe(new Filter(fn));
    },

    /** 
    .reduce()
    Consumes the stream, returns a promise of the accumulated value.
    **/
    reduce: function(fn, accumulator) {
        return this.pipe(new Reduce(fn, accumulator)).start();
    },

    /** 
    .scan()
    **/
    scan: function(fn, accumulator) {
        return this.pipe(new Scan(fn, accumulator));
    },

    /** 
    .each()
    **/
    each: function(fn) {
        return this.pipe(new Each(fn)).start();
    },

    /** 
    .pipe()
    **/
    pipe: function(consumer) {
        // TODO: find a less smelly mechanism than this
        consumer.start = this.start;
        consumer.done && consumer.done(this);
        return this.consumer = consumer;
    },
    
    
    take: function(n) {
        this.pipe(new Take(n));
    },

    /** 
    .done()
    **/
    done: function(stopable) {
        this.stopables = this.stopables || [];
        this.stopables.push(stopable);
        return this;
    },

    /** 
    .start()
    **/
    start: function() {
        //console.log('START not done');
    },

    /** 
    .stop()
    **/
    stop: function() {
        this.consumer = nothing;
        this.stopables && done(this.stopables);
        return this;
    }
});

assign(Stream, {
    /**
    Stream.from(values)
    **/
    from: function(values) {
        return new Stream((controller) => controller.push.apply(controller, values));
    },

    /**
    Stream.of(value1, value2, ...)
    **/
    of: function() {
        return this.from(arguments);
    }
});


/*
Map()
*/

const mapProperties = assign({ fn: { value: id }}, properties);

function Map(fn) {
    mapProperties.fn.value = fn;
    define(this, mapProperties);
}

Map.prototype = create(Stream.prototype);

Map.prototype.push = function map(value) {
    if (value !== undefined) {
        this.consumer.push(this.fn(value));
    }
    return this;
};


/*
Filter()
*/

function Filter(fn) {
    mapProperties.fn.value = fn;
    define(this, mapProperties);
}

Filter.prototype = create(Stream.prototype);

Filter.prototype.push = function filter(value) {
    if (value !== undefined && this.fn(value)) {
        this.consumer.push(value);
    }

    return this;
};


/*
Take()
*/

const takeProperties = assign({ n: { value: 0 }}, properties);

function Take(n) {
    if (typeof n !== 'number' || n < 1) {
        throw new Error('stream.take(n) accepts non-zero positive integers as n (' + n + ')');
    }

    takeProperties.n.value = n;
    define(this, takeProperties);
}

Take.prototype = create(Stream.prototype);

Take.prototype.push = function take(value) {
    this.consumer.push(value);

    if (!(--this.n)) {
        // Stream is dead TODO stop only downstream objects
        this.stop();
    }

    return this;
};


/*
Reduce()
*/

const reduceProperties = assign({ value: { writable: true } }, mapProperties);

function Reduce(fn, accumulator) {
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
}

Reduce.prototype = create(Stream.prototype);

Reduce.prototype.push = function reduce(value) {
    if (value !== undefined) {
        this.value = this.fn(this.value, value);
    }

    return new Promise((resolve, reject) => {
        this.done(() => resolve(this.value));
    });
};


/*
Scan()
*/

function Scan(fn, accumulator) {
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
}

Scan.prototype = create(Stream.prototype);

Scan.prototype.push = function scan(value) {
    if (value !== undefined) {
        this.value = this.fn(this.value, value);
        this.consumer.push(this.value);
    }

    return this;
};


/*
Each()
*/

function Each(fn) {
    this.push = fn;
}

Each.prototype = create(Stream.prototype);

Each.prototype.pipe = function() {
    throw new Error('Stream cannot .pipe() from consumed stream');
};
