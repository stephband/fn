
import isIterable      from '../is-iterable.js';
import Stopable        from './stopable.js';
import { stop }        from './producer.js';
import BufferProducer  from './buffer-producer.js';
import PromiseProducer from './promise-producer.js';

const assign = Object.assign;
const create = Object.create;


/* Stream */

function push(stream, value) {
    if (value !== undefined) {
        stream[0].push(value);
    }
}

function unpipe(stream, output) {
    // Support broadcast streams: streams with more than 1 output. Remove output
    // from outputs then send stop signal to output and all its descendants.
    if (stream[1]) {
        let n = -1;
        while (stream[++n] && stream[n] !== output);
        while (stream[n++]) { stream[n - 1] = stream[n]; }
        stop(output);
    }

    // Otherwise keep going back up the chain looking for a point to launch
    // stop signal.
    else {
        stream.stop();
    }
}

export default function Stream(producer) {
    this.input = producer;
}

assign(Stream, {
    /**
    Stream.of(value1, value2, ...)
    Creates a buffer stream from parameters.
    **/
    of: function() {
        return new Stream(new BufferProducer(arguments));
    },

    /**
    Stream.from(source)
    Creates a stream from a `source`, which may be an array (or array-like),
    a promise, or a producer.
    **/
    from: function(source) {
            // Source is a stream or producer
        return source.pipe ? new Stream(source) :
            // Source is a promise
            source.then ? new Stream(new PromiseProducer(source)) :
            // Source is an array-like
            new Stream(new BufferProducer(source));
    }
});

assign(Stream.prototype, Stopable.prototype, {
    /**
    .push(value)
    Pushes `value` into the stream. If the stream has not been started or is
    already stopped this will cause an error.
    **/
    push: function(value) {
        if (window.DEBUG && !this[0]) {
            throw new Error('Stream: attempt to .push() to a stopped stream (has a producer not been stopped correctly?)');
        }

        push(this, value);
    },

    /**
    .pipe(stream)
    Starts a stream and pushes its values into `stream`. Returns `stream`.
    **/
    pipe: function(output) {
        if (this[0]) {
            throw new Error('Stream: Attempt to .pipe() a unicast stream multiple times. Create a multicast stream with stream.broadcast().');
        }

        this[0] = output;
        this.input.pipe(this);
        return output;
    },

    /**
    .map(fn)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    map: function(fn) {
        return new Map(this, fn);
    },

    /**
    .filter(fn)
    Filters out values from the stream where `fn(value)` is falsy.
    **/
    filter: function(fn) {
        return new Filter(this, fn);
    },

    /**
    .flatMap(fn)
    **/
    flatMap: function(fn) {
        return new FlatMap(this, fn);
    },

    /**
    .take(n)
    Returns a stream of the first `n` values of the stream.
    **/
    take: function(n) {
        return new Take(this, n);
    },

    /**
    .each(fn)
    Starts the stream and calls `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        return new Each(this, fn);
    },

    /**
    .reduce(fn, initial)
    Consumes the stream. TODO: Not sure what to return old boy.
    **/
    reduce: function(fn, initial) {
        return new Reduce(this, fn, initial);
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan: function(fn, initial) {
        return new Scan(this, fn, initial);
    },

    /**
    .stop()
    Stops the stream.
    **/
    stop: function() {
        // We send to unpipe() to support broadcast streams, a unicast stream
        // at input only requires this.input.stop()
        unpipe(this.input, this);
        return this;
    }

    /**
    .done(fn)
    Cues `fn` to be called when the stream is stopped.
    **/
});


/* Map */

function Map(input, fn) {
    this.input = input;
    this.fn    = fn;
}

Map.prototype = assign(create(Stream.prototype), {
    push: function map(value) {
        const fn = this.fn;
        push(this, fn(value));
    }
});


/* Filter */

function Filter(input, fn) {
    this.input = input;
    this.fn    = fn;
}

Filter.prototype = assign(create(Stream.prototype), {
    push: function filter(value) {
        const fn = this.fn;
        const is = fn(value);
        is && push(this, value);
    }
});


/* FlatMap */

function FlatMap(input, fn) {
    this.input = input;
    this.fn    = fn;
}

FlatMap.prototype = assign(create(Stream.prototype), {
    push: function flatMap(value) {
        const fn     = this.fn;
        const values = fn(value);

        if (values !== undefined) {
            if (isIterable(values)) {
                for (const value of values) {
                    push(this, value);
                }
            }
            else {
                // Todo: support flattening of streams. Should streams by made
                // iterable? CAN streams be made iterable? They'd have to be async?
                throw new Error('Stream: Cannot .flatMap() non-iterable values');
            }
        }
    }
});


/* Take */

function Take(input, n) {
    if (window.DEBUG && (typeof n !== 'number' || n < 1)) {
        throw new Error('Stream: .take() only accepts non-zero positive integers (' + n + ')');
    }

    this.input = input;
    this.count = n;
}

Take.prototype = assign(create(Stream.prototype), {
    push: function take(value) {
        this[0].push(value);
        if (!(--this.count)) {
            this.stop();
        }
    }
});


/*
Reduce
*/

function Reduce(input, fn, accumulator) {
    this.input = input;
    this.fn    = fn;
    this.value = accumulator;
}

Reduce.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const fn = this.fn;
        this.value = fn(this.value, value);
    }
});


/* Scan */

function Scan(input, fn, accumulator) {
    this.input = input;
    this.fn    = fn;
    this.value = accumulator;
}

Scan.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const fn = this.fn;
        this.value = fn(this.value, value);
        this[0].push(this.value);
    }
});


/* Each */

function Each(input, fn) {
    this.input = input;
    this.push  = fn;

    // Start pulling values
    input.pipe(this);
}

Each.prototype = assign(create(Stream.prototype), {
    each: null,
    pipe: null
});
