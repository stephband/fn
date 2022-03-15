
import id      from '../modules/id.js';
import noop    from '../modules/noop.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/**
Stream(fn)
Creates a mappable stream of values.
**/

const properties = {
    source: { writable: true },
    target: { writable: true }
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

function pushError() {
    throw new Error('Attempted stream.push() to a stopped stream');
}

function startError() {
    throw new Error('Attempted stream.start() but stream already started');
}


/* Source */

export function Source(start) {
    this.setup = start;
}

assign(Source.prototype, {
    pipe: function(stream) {
        this.target = stream;
    },

    start: function() {
        // Method may be used once only
        if (window.DEBUG) { this.start = startError; }

        const start  = this.fn;
        this.setup(this.target, arguments);

        // Update count of running streams
        ++Stream.count;
    },

    stop: function stop() {
        // Cannot push() after stop()
        if (window.DEBUG) { this.push = pushError; }

        this.stopables && stopAll(this.stopables);
        // Update count of running streams
        --Stream.count;
    },

    done: function done(fn) {
        const stopables = this.stopables || (this.stopables = []);
        stopables.push(fn);
    }
});


/* Stream */

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
    },

    /**
    Stream.combine(stream1, stream2, ...)
    Creates a stream by combining the latest values of all input streams into
    an objects containing those values. A new object is emitted when a new value
    is pushed to any input stream.
    **/
    combine: function combine() {
        return Combine(arguments);
    },

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    **/
    merge: function() {
        return Merge(arguments);
    },

    /**
    Stream.count
    Keeps a count of unstopped streams. This may help you identify when
    something is not stopping correctly in your code.
    **/
    count: 0
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
    .map(fn)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    map: function(fn) {
        return this.target = new Map(this.source, fn);
    },

    /**
    .filter(fn)
    Filters out values from the stream where `fn(value)` is falsy.
    **/
    filter: function(fn) {
        return this.target = new Filter(this.source, fn);
    },

    /**
    .reduce(fn, initial)
    Consumes the stream, returns a promise of the accumulated value.
    Todo: except it doesn't though. Do something about this. Decide what it
    should return, and if it is to be a promise, make it resolve as
    stream.done() to avoid Promise overhead and asynciness?
    **/
    reduce: function(fn, initial) {
        return this.pipe(new Reduce(this.source, fn, initial));
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan: function(fn, accumulator) {
        return this.target = new Scan(this.source, fn, accumulator);
    },

    /**
    .take(n)
    Returns a stream of the first `n` values of the stream.
    **/
    take: function(n) {
        return this.target = new Take(this.source, n);
    },

    /**
    .each(fn)
    Starts the stream and calls `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        return this.pipe(new Each(this.source, fn));
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
    value = this.fn(value);

    if (value !== undefined) {
        this.target.push(value);
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
    if (this.fn(value)) {
        this.target.push(value);
    }

    return this;
};


/*
Take()
*/

const takeProperties = assign({ n: { value: 0, writable: true }}, properties);

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

function Reduce(source, fn, accumulator) {
    reduceProperties.source.value = source;
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
}

Reduce.prototype = create(Stream.prototype);

Reduce.prototype.push = function reduce(value) {
    value = this.fn(this.value, value);

    if (value !== undefined) {
        this.value = value;
    }

    // Todo: why are we doing this? This crazy!
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


/*
Combine()
*/

function Combine(streams) {
    return new Stream((controller) => {
        const values = {};
        let i = -1, stream;
        while (stream = streams[++i]) {
            const n = i;
            if (stream.each) {
                stream.each((value) => {
                    values[n] = value;
                    controller.push(assign({}, values));
                });
            }
            else if (stream.then) {
                stream.then((value) => {
                    values[n] = value;
                    controller.push(assign({}, values));
                });
                // Todo: what do we do with errors?
            }
            else {
                console.log('Todo: combine() raw values ?');
            }
        }
    });
}


/*
Merge()
*/

export function Merge(streams) {
    return new Stream((controller) => {
        let i = -1, stream;
        while (stream = streams[++i]) {
            if (stream.each) {
                // Merge streams
                stream.each((value) => controller.push(value));
                // And stop them when this one stops?
                controller.done(stream);
            }
            else if (stream.then) {
                stream.then((value) => controller.push(value));
                // What should we do with errors?
            }
            else {
                // Merge arrays or array-likes
                controller.push.apply(controller, stream);
            }
        }
    });
}


// Debug

if (window.DEBUG) {
    window.Stream = Stream;
}
