
import isIterable from '../is-iterable.js';
import overload   from '../overload.js';
import toType     from '../to-type.js';
import Stream, { push, cold } from './stream.js';


const assign = Object.assign;
const define = Object.defineProperty;


function throwTypeError(source) {
    throw new TypeError('Stream cannot be created .from() ' + typeof source);
}


/**
ColdStream(start)
A lazy stream that starts automatically when a consumer is first attached, and
stops automatically when its last consumer detaches or its last upstream input
stops.

Optionally accepts a `start(push, stop)` function called on `.start()`, where
`push(value)` emits values and `stop()` stops the stream. If `start` returns a
function it is registered with `.done()`.
**/

export default class ColdStream extends Stream {
    #start;

    constructor(start) {
        super();
        if (start) this.#start = start;
    }

    /**
    .start()
    **/
    start() {
        // If this is 'running' or 'done' we need do nothing here
        if (this.status) return this;

        // Loop through inputs
        let i = 0, input;
        inputloop: while (input = this[--i]) {
            // Loop through input's outputs
            let o = -1;
            // If input already has this as an output skip set up
            while (input[++o]) if (input[o] === this) continue inputloop;
            // Set this as input's output
            input[o] = this;
            // If input is a cold stream and this is its first consumer, start it
            if (o === 0 && input[cold]) input.start();
        }

        if (this.#start) {
            const cleanup = this.#start(
                (value) => push(this, value),
                () => this.stop()
            );
            if (typeof cleanup === 'function') this.done(cleanup);
        }

        return this;
    }

    /**
    .pipe(output)
    Sets up this cold stream to pipe values into `output` when started. Starts
    immediately where `output` is a hot Stream, a Consumer, or an already-running
    ColdStream. Returns `output`.
    **/
    pipe(output) {
        // If output is stop-able set this as its input
        if (output.stop) {
            // Guard against this piping twice to output
            let i = 0;
            while (output[--i]) if (output[i] === this) break;
            output[i] = this;
        }

        // If output is a cold stream and is not already running wait to start this
        if (output[cold] && !(output[0] || output.status === 'running')) {
            return output;
        }

        // Start piping right away
        let o = -1;
        while (this[++o]) if (this[o] === output) break;
        this[o] = output;
        // If output is the first consumer to be added start this
        if (!o) this.start();

        // Return output
        return output;
    }
}

// Mark ColdStream.prototype as cold so both class subclasses and
// Object.create(ColdStream.prototype) prototypes are recognised without
// circular imports in stream.js.
define(ColdStream.prototype, cold, { value: true });


/**
PromiseStream(promise)
**/

class PromiseStream extends ColdStream {
    constructor(promise) {
        super();
        this.promise = promise;
    }

    start() {
        this.promise
        .then((value) => push(this, value))
        .finally(() => this.stop());
        return this;
    }
}


/*
Value(value)
A Value stream represents a persistent value. Streams piped from a value stream
are given its current value. A Value stream may be pushed to before it is piped.
*/

class Value extends ColdStream {
    constructor(value) {
        super();
        this.value = value;
    }

    start() {
        if (this.value !== undefined) {
            push(this, this.value);
            // If stream was stopped as a result of a push, don't continue pushing
            if (this.status === 'done') return this;
        }

        // Start streams that are piped to this buffer stream
        return super.start();
    }

    push(value) {
        this.value = value;
        return push(this, value);
    }
}


/*
BufferStream(values)
A BufferStream may be pushed to before it is piped, as it starts life with an
array buffer of values.
*/

class BufferStream extends ColdStream {
    constructor(values) {
        super();
        this.values = values || [];
    }

    start() {
        const values = this.values;
        if (!values) return super.start();

        // Loop over values
        let n = -1;
        while (n++ < values.length) {
            // Push values to stream
            push(this, values[n]);
            // If stream was stopped as a result of a push, don't continue pushing
            if (this.status === 'done') return this;
        }

        // Throw away values buffer
        this.values = undefined;

        // Start streams that are piped to this buffer stream
        return super.start();
    }

    push(value) {
        this.value = value;
        return this.values ?
            this.values.push(this.value) :
            push(this, this.value) ;
    }
}


/* Filter() */

class Filter extends ColdStream {
    constructor(fn) {
        super();
        this.fn = fn;
    }

    push(value) {
        const fn = this.fn;
        return fn(value) && push(this, value);
    }
}


/* FlatMap() */

class FlatMap extends ColdStream {
    constructor(fn) {
        super();
        this.fn = fn;
    }

    push(value) {
        const fn     = this.fn;
        const values = fn(value);

        if (values === undefined) { return; }

        // Flatten array or array-like
        if (isIterable(values)) {
            for (const value of values) {
                push(this, value);
            }
        }
        // Flatten stream
        else if (values.pipe) {
            console.warn('FlatMapping pipeables is dodgy. Map to arrays for the moment please.');
            // Todo: support flattening of streams. This method is crude -
            // it does not preserve order, for one thing. Should streams be
            // made iterable? CAN streams be made iterable? They'd have to
            // be async...
            this.done(values.each((value) => push(this, value)));
        }
        // Flatten promise
        else if (values.then) {
            values.then((value) => push(this, value));
        }
    }
}


/* Map() */

class Map extends ColdStream {
    constructor(fn) {
        super();
        this.fn = fn;
    }

    push(value) {
        const fn     = this.fn;
        const result = fn(value);
        // Reject undefined
        return result !== undefined && push(this, result);
    }
}


/* Merge() */

class Merge extends ColdStream {
    constructor(inputs) {
        super();
        this.inputs = inputs;
    }

    push(value) {
        return push(this, value);
    }

    pipe(output) {
        let n = -1, input;
        while (input = this.inputs[++n]) Stream.from(input).pipe(this);
        return super.pipe(output);
    }
}


/* Scan() */

class Scan extends ColdStream {
    constructor(fn, accumulator) {
        super();
        this.fn    = fn;
        this.value = accumulator;
    }

    push(value) {
        const fn = this.fn;
        this.value = fn(this.value, value);
        push(this, this.value);
    }
}


/* Slice() */

class Slice extends ColdStream {
    constructor(n, m = Infinity) {
        if (globalThis.DEBUG && (typeof n !== 'number' || n < 0)) {
            throw new Error('Stream: .slice() requires a positive integer (' + n + ')');
        }

        if (globalThis.DEBUG && (typeof m !== 'number' || m < 1)) {
            throw new Error('Stream: .slice() requires a non-zero positive integer (n, ' + n + ')');
        }

        super();
        this.index = -n;
        this.indexEnd = m - n;
    }

    push(value) {
        if (++this.index > 0) push(this, value);
        if (this.index === this.indexEnd) this.stop();
    }
}


/* Split(input, fn) */

class Split extends ColdStream {
    constructor(fn) {
        super();
        this.chunk = [];

        if (typeof fn === 'number') this.n = fn;
        else this.fn = fn;
    }

    fn() {
        return this.chunk.length === this.n;
    }

    push(value) {
        const chunk = this.chunk;

        if (this.fn(value)) {
            // Emit complete chunk and create a new chunk
            push(this, chunk);
            this.chunk = [];
        }
        else {
            // Push to existing chunk
            chunk.push(value);
        }
    }
}


// Attach cold combinators to Stream.prototype so both hot Streams and
// ColdStreams inherit them, and attach cold factories to Stream.

assign(Stream.prototype, {
    /**
    .buffer(...values)
    Inserts a buffer of values into the start of a stream. Although the buffer
    is not hot, before it is started .push() may be used to add values to the
    buffer.
    **/
    buffer(...values) {
        return this.pipe(new BufferStream(values));
    },

    /**
    .filter(fn)
    Filters out values where `fn(value)` is falsy.
    **/
    filter(fn) {
        return this.pipe(new Filter(fn));
    },

    /**
    .flatMap(fn)
    **/
    flatMap(fn) {
        return this.pipe(new FlatMap(fn));
    },

    /**
    .map(fn)
    Maps each value in a stream to `fn(value)` and pipes non-`undefined` results
    downstream.
    **/
    map(fn) {
        return this.pipe(new Map(fn));
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan(fn, initial) {
        return this.pipe(new Scan(fn, initial));
    },

    /**
    .slice(n, m)
    Returns a stream of the nth to mth values of stream.
    **/
    slice(n, m) {
        return this.pipe(new Slice(n, m));
    },

    /**
    .split(n)
    **/
    split(n) {
        return this.pipe(new Split(n));
    }
});

assign(Stream, {
    from: overload(toType, {
        /**
        Stream.from(fn)
        Create a pushable map stream from function `fn`.
        **/
        function: (fn) => new Map(fn),

        object: (object) =>
            /**
            Stream.from(stream)
            Treat a pipe-able as a stream directly.
            **/
            typeof object.pipe === 'function' ? object :

            /**
            Stream.from(promise)
            Create a read-only stream from a promise. The stream is stopped when
            the promise resolves or rejects.
            **/
            typeof object.then === 'function' ? new PromiseStream(object) :

            /**
            Stream.from(array)
            Create a pushable buffer stream from an array or array-like object.
            **/
            typeof object.length === 'number' ? new BufferStream(Array.from(object)) :

            // object cannot be made into stream
            throwTypeError(object)
    }),

    /**
    Stream.of(...values)
    Create a pushable value or buffer stream from parameter values.
    **/
    of(...values) {
        return values.length < 2 ?
            new Value(values[0]) :
            new BufferStream(values) ;
    },

    /**
    Stream.buffer(...values)
    Create a pushable buffer stream with initial buffer of arguments.
    **/
    buffer(values) {
        return new BufferStream(values);
    },

    /**
    Stream.value(value)
    Create a pushable value stream with initial `value`.
    **/
    value(value) {
        return new Value(value);
    },

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream. Values are emitted in the time order they are received
    from inputs.
    **/
    merge(...inputs) {
        return new Merge(inputs);
    }
});
