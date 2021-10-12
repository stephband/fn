
import id      from '../modules/id.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/**
Stream()
**/

const properties = {
    source:    { writable: true },
    consumer:  { writable: true }
};

function stopOne(stopable) {
    return stopable.stop ?
        stopable.stop() : 
        stopable() ;
}

function stopAll(stopables) {
    stopables.forEach(stopOne);
    stopables.length = 0;
}

function push() {
    const length = arguments.length;
    let n = -1;
    while (++n < length) {
        this.consumer.push(arguments[n]);
    }
    return this;
}

function stop() {
    this.stopables && stopAll(this.stopables);
    //this.consumer = undefined;
    return this;
    //throw new Error('TODO: Implement stream mouth stop()');
}

function done(fn) {
    if (this === fn) {
        throw new Error('eh?')
    }
    const stopables = this.stopables || (this.stopables = []);
    stopables.push(fn);
    return this;
}

const sourceProps = {
    push: { value: push },
    stop: { value: stop }
};

export default function Stream(start) {
    // Support construction without `new`
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(start);
    }

    const stream = this;

    this.start = function() {
        // Assign push(), stop() if they are returned
        assign(this, start(create(this, sourceProps)));
        return this;
    };

    this.stop   = stop;
    this.done   = done;
    this.source = this;
}

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

assign(Stream.prototype, {
    /** 
    .map()
    **/
    map: function(fn) {
        return this.pipe(new Map(this.source, fn));
    },

    /** 
    .filter()
    **/
    filter: function(fn) {
        return this.pipe(new Filter(this.source, fn));
    },

    /** 
    .reduce()
    Consumes the stream, returns a promise of the accumulated value.
    **/
    reduce: function(fn, accumulator) {
        return this.pipe(new Reduce(this.source, fn, accumulator)).start();
    },

    /** 
    .scan()
    **/
    scan: function(fn, accumulator) {
        return this.pipe(new Scan(this.source, fn, accumulator));
    },

    /** 
    .each()
    **/
    each: function(fn) {
        return this.pipe(new Each(this.source, fn)).start();
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
    done: function(fn) {
        this.source.done(fn);
        return this;
    },

    /** 
    .start()
    **/
    start: function() {
        this.source.start();
        return this;
    },

    /** 
    .stop()
    **/
    stop: function() {
        this.source.stop();
        return this;
    }
});


/*
Map()
*/

const mapProperties = assign({ fn: { value: id }}, properties);

function Map(source, fn) {
    mapProperties.source.value = source;
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

function Filter(source, fn) {
    mapProperties.source.value = source;
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

function Take(source, n) {
    if (typeof n !== 'number' || n < 1) {
        throw new Error('stream.take(n) accepts non-zero positive integers as n (' + n + ')');
    }

    takeProperties.source.value = source;
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

const reduceProperties = assign({
    value: { writable: true }
}, mapProperties);

function Reduce(source, fn, accumulator) {
    reduceProperties.source.value = source;
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

function Scan(source, fn, accumulator) {
    reduceProperties.source.value = source;
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

const eachProperties = {
    source: { writable: true }
};

function Each(source, fn) {
    eachProperties.source.value = source;
    define(this, eachProperties);
    this.push = fn;
}

Each.prototype = create(Stream.prototype, {
    // Can't consume a consumed stream
    each: { value: null },
    pipe: { value: null }
});