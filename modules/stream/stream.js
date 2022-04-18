
import id         from '../id.js';
import isIterable from '../is-iterable.js';
import noop       from '../noop.js';

import Stopable   from './stopable.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/* Source */

function startError() {
    throw new Error('Attempted stream.start() but stream already started');
}

function pushError() {
    throw new Error('Attempted stream.push() to a stopped stream');
}

export function Source(start) {
    this.setup = start;
}

assign(Source.prototype, Stopable.prototype, {
    pipe: function(stream) {
        this.target = stream;
    },

    start: function() {
        // Method may be used once only
        if (window.DEBUG) { this.start = startError; }
        const setup = this.setup;
        setup(this.target, arguments);
    }
});

if (window.DEBUG) {
    // Override Source.stop() with error handling for push() after stop()
    Source.prototype.stop = function() {
        // Cannot push() after stop()
        this.push = pushError;
        Stopable.prototype.stop.apply(this, arguments);
    };
}


/**
Stream(fn)
Creates a mappable stream of values.
**/

export default function Stream(start) {
    // Support construction without `new`
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(start);
    }

    this.source = typeof start === 'function' ?
        // New source calls start(source) when the stream is started
        new Source(start) :
        // Also accept a producer stream as source. It will be started, stopped
        // and done when this stream is started, stopped and done.
        start ;

    this.source.pipe(this);
}


assign(Stream, {
    /**
    Stream.from(values)
    Creates a stream from the array (or array-like) collection `values`.
    **/
    from: function(values) {
        return new Stream(values.length ?
            (controller) => controller.push.apply(controller, values) :
            noop
        );
    },

    /**
    Stream.of(value1, value2, ...)
    Creates a stream using parameters as values.
    **/
    of: function() {
        return this.from(arguments);
    }
});

assign(Stream.prototype, {
    /**
    .push(value)
    Pushes `value` into the stream. If the stream has not been started or is
    already stopped this will cause an error.
    **/
    push: function() {
        const target = this.target;

        // If there is no target the stream has not been started yet
        if (window.DEBUG && !target) {
            throw new Error('Cannot .push() to unstarted stream');
        }

        const length = arguments.length;
        let n = -1;
        while (++n < length) {
            arguments[n] !== undefined && target.push(arguments[n]);
        }

        return this;
    },

    /**
    .pipe(stream)
    Starts the stream and pushes its values to `stream`.
    Returns `stream`.
    **/
    pipe: function(target) {
        this.target = target;
        this.start();
        return target;
    },

    /**
    .start()
    Starts the stream. Normally this is called internally by a consumer method.
    Caution: where `start()` is called and values are pushed to the stream
    without a consumer attached, the stream will error.
    **/
    start: function() {
        this.source.start.apply(this.source, arguments);
        return this;
    },

    /**
    .stop()
    Stops the stream.
    **/
    stop: function() {
        this.source.stop.apply(this.source, arguments);
        return this;
    },

    /**
    .done(fn)
    Cues `fn` to be called when the stream is stopped.
    **/
    done: function(fn) {
        this.source.done(fn);
        return this;
    }
});



/*
Transforms
*/

const properties = {
    source: { writable: true },
    target: { writable: true }
};

/*
Map()
*/

const mapProperties = assign({ fn: { value: id }}, properties);

export function Map(source, producer, fn) {
    mapProperties.source.value = source;
    mapProperties.fn.value = fn;
    define(this, mapProperties);
    // producer.pipe(this) ??
    producer.target = this;
}

Map.prototype = create(Stream.prototype);

Map.prototype.push = function map(value) {
    value = this.fn(value);

    if (value !== undefined) {
        this.target.push(value);
    }

    return this;
};


/*
Filter()
*/

export function Filter(source, producer, fn) {
    mapProperties.source.value = source;
    mapProperties.fn.value = fn;
    define(this, mapProperties);
    // producer.pipe(this) ??
    producer.target = this;
}

Filter.prototype = create(Stream.prototype);

Filter.prototype.push = function filter(value) {
    if (this.fn(value)) {
        this.target.push(value);
    }

    return this;
};


/*
FlatMap()
*/

export function FlatMap(source, producer, fn) {
    mapProperties.source.value = source;
    mapProperties.fn.value = fn;
    define(this, mapProperties);
    // producer.pipe(this) ??
    producer.target = this;
}

FlatMap.prototype = create(Stream.prototype);

FlatMap.prototype.push = function flatMap(value) {
    const values = this.fn(value);

    if (values !== undefined) {
        if (isIterable(values)) {
            for (const value of values) {
                if (value !== undefined) {
                    this.target.push(value);
                }
            }
        }
        else {
            // Todo: support flattening of streams. Should streams by made
            // iterable? CAN streams be made iterable? They'd have to be async.
            throw new Error('Cannot .flatMap() non-iterable values');
        }
    }

    return this;
};


/*
Take()
*/

const takeProperties = assign({ n: { value: 0, writable: true }}, properties);

export function Take(source, producer, n) {
    if (typeof n !== 'number' || n < 1) {
        throw new Error('stream.take(n) accepts non-zero positive integers as n (' + n + ')');
    }

    takeProperties.source.value = source;
    takeProperties.n.value = n;
    define(this, takeProperties);
    // producer.pipe(this) ??
    producer.target = this;
}

Take.prototype = create(Stream.prototype);

Take.prototype.push = function take(value) {
    this.target.push(value);

    if (!(--this.n)) {
        this.stop();
    }

    return this;
};


/*
Reduce()
Todo: see notes next to .reduce() method
*/

const reduceProperties = assign({
    value: { writable: true }
}, mapProperties);

export function Reduce(source, producer, fn, accumulator) {
    reduceProperties.source.value = source;
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
    // producer.pipe(this) ??
    producer.target = this;
    source.start();
}

Reduce.prototype = create(Stream.prototype);

Reduce.prototype.push = function reduce(value) {
    value = this.fn(this.value, value);

    if (value !== undefined) {
        this.value = value;
    }

    return this;
};


/*
Scan()
*/

export function Scan(source, producer, fn, accumulator) {
    reduceProperties.source.value = source;
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
    // producer.pipe(this) ??
    producer.target = this;
}

Scan.prototype = create(Stream.prototype);

Scan.prototype.push = function scan(value) {
    value = this.fn(this.value, value);

    if (value !== undefined) {
        this.value = value;
        this.target.push(value);
    }

    return this;
};


/*
Each()
*/

const eachProperties = {
    source: { writable: true }
};

export function Each(source, producer, fn) {
    eachProperties.source.value = source;
    define(this, eachProperties);
    this.push = fn;
    // producer.pipe(this) ??
    producer.target = this;
    source.start();
}

Each.prototype = create(Stream.prototype, {
    // Can't consume a consumed stream
    each: { value: null },
    pipe: { value: null }
});
