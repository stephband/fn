
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
    push: function() {
        const length = arguments.length;
        let n = -1;
        while (++n < length) {
            this.consumer.push(arguments[n]);
        }
    },

    stop: function() {
        //console.log('stream.stop()');
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
    if (!start) {
        return new Pushable();
    }

    const stream = this;

    this.start = function() {
        start(assign(create(stream), producerProperties));
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
        console.log('START not done');
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
        return new Stream((push) => push.apply(null, values));
    },

    /**
    Stream.of(value1, value2, ...)
    **/
    of: function() {
        return this.from(arguments);
    }
});


/*
Pushable()
*/

function Pushable() {}

Pushable.prototype = create(Stream.prototype);

Pushable.prototype.push = function(value) {
    if (!this.consumer) { return this; }
    let n = -1;
    while (++n < arguments.length) {
        this.consumer.push(arguments[n]);
    }
    return this;
};


/*
Map()
*/

const mapProperties = assign({ fn: { value: id }}, properties);

function Map(fn) {
    mapProperties.fn.value = fn;
    define(this, mapProperties);
}

Map.prototype = create(Stream.prototype);

Map.prototype.push = function push(value) {
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

Filter.prototype.push = function push(value) {
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

Take.prototype.push = function push(value) {
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

Reduce.prototype.push = function(value) {
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

Scan.prototype.push = function(value) {
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
