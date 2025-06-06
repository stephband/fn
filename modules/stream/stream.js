
import noop       from '../noop.js';
import overload   from '../overload.js';
import toType     from '../to-type.js';
import Stopable   from './stopable.js';


const assign = Object.assign;
const create = Object.create;


function throwTypeError(source) {
    throw new TypeError('Stream cannot be created .from() ' + typeof source);
}

function push(stream, value) {
    if (value === undefined) return;
    let n = -1;
    while (stream[++n]) stream[n].push(value);
    return stream;
}

function stop(stream) {
    // Call done functions and listeners
    Stopable.prototype.stop.apply(stream);

    // Loop through outputs, propagate stop() down the pipe
    let o = -1, output;
    while (output = stream[++o]) {
        // Remove output from stream
        stream[o] = undefined;
        // If output is not stop-able it never got stream as an input
        if (!output.stop) continue;
        // Remove stream from output's inputs
        removeInput(output, stream);
        // If output has no inputs left, stop it
        if (!output[-1]) output.stop();
    }

    return stream;
}

function removeInput(stream, input) {
    // Remove input from stream
    let i = 0;
    while (stream[--i] && stream[i] !== input);
    while (stream[i--]) stream[i + 1] = stream[i];
}

function removeOutput(stream, output) {
    // Remove output from stream
    let o = -1;
    while (stream[++o] && stream[o] !== output);
    while (stream[o++]) stream[o - 1] = stream[o];
}

function unpipe(output, input) {
    // Remove link between streams without stopping them
    removeInput(input, output);
    removeOutput(output, input);
}


/* Consumer() */

export class Consumer extends Stopable {
    /**
    .stop()
    Stops the stream.
    **/
    stop() {
        if (this.status === 'done') return this;

        // Loop through inputs, notify them we are detaching
        let input;
        while (input = this[-1]) {
            // Remove input from this
            let i = -1;
            while (this[i--]) this[i + 1] = this[i];

            // Remove this from input's outputs
            removeOutput(input, this);

            // If input is stop-able and has no other outputs, stop it
            if (input.stop && !input[0]) input.stop(input);
        }

        // Set status and call done(fn) handlers
        return super.stop();
    }
}


/* Each(fn) */

class Each extends Consumer {
    constructor(fn) {
        super();
        this.push = fn;
    }
}


/* Reduce() */

class Reduce extends Consumer {
    constructor(fn, accumulator) {
        super();
        this.fn    = fn;
        this.value = accumulator;
        this.i     = 0;
    }

    push(value) {
        const fn = this.fn;
        this.value = fn(this.value, value, this.i++, this);
    }
}


/**
Stream(start)
Creates a stream from a `start` function, called when a consumer is first
attached, with two arguments, `start(push, stop)`. `push(value)` is called to
write `value` to the stream and `stop()` is called to stop the stream.
**/

export default class Stream extends Consumer {
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
            // If input is start-able and this is its first consumer, start it,
            // otherwise assume it is running
            if (o === 0 && input.start) input.start();
        }

        return this;
    }

    stop() {
        if (this.status === 'done') return this;

        super.stop();

        // Loop through outputs, propagate stop() down the pipe
        let o = -1, output;
        while (output = this[++o]) {
            // Remove output from this
            this[o] = undefined;
            // If output is not stop-able it never got this as an input
            if (!output.stop) continue;
            // Remove this from output's inputs
            removeInput(output, this);
            // If output has no inputs left, stop it
            if (!output[-1]) output.stop();
        }

        return this;
    }

    /**
    .pipe(stream)
    Sets up this stream to pipe values into `stream` when started. Starts
    immediately where `stream` is already running. Returns `stream`.
    **/
    pipe(output) {
        // If output is stop-able set this as its input
        if (output.stop) {
            // Guard against this piping twice to output
            let i = 0;
            while (output[--i]) if (output[i] === this) break;
            output[i] = this;
        }

        // If output is start-able and is not already running wait to start this
        if (output.start && !(output[0] || output.status === 'running')) {
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

    /**
    .each(fn)
    Consumes the stream, calling `fn(value)` for each piped value. Returns the
    stream.
    **/
    each(fn) {
        // Start the Consumer immediately
        return this.pipe(new Each(fn));
    }

    /**
    .buffer(...values)
    Inserts a buffer of values into the start of a stream. Although the buffer
    is not hot, before it is started .push() may be used to add values to the
    buffer.
    **/
    buffer(...values) {
        return this.pipe(new BufferStream(values));
    }

    /**
    .filter(fn)
    Filters out values where `fn(value)` is falsy.
    **/
    filter(fn) {
        return this.pipe(new Filter(fn));
    }

    /**
    .flatMap(fn)
    **/
    flatMap(fn) {
        return this.pipe(new FlatMap(fn));
    }

    /**
    .map(fn)
    Maps each value in a stream to `fn(value)` and pipes non-`undefined` results
    downstream.
    **/
    map(fn) {
        return this.pipe(new Map(fn));
    }

    /**
    .reduce(fn, initial)
    Consume the stream, calling `fn(accumulator, value)` for each value in it.
    Returns the accumulator.
    **/
    reduce(fn, accumulator) {
        return this.pipe(new Reduce(fn, accumulator)).start().value;
    }

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan(fn, initial) {
        return this.pipe(new Scan(fn, initial));
    }

    /**
    .slice(n, m)
    Returns a stream of the nth to mth values of stream.
    **/
    slice(n, m) {
        return this.pipe(new Slice(n, m));
    }

    /**
    .split(n)
    **/
    split(n) {
        return this.pipe(new Split(n));
    }

    /* Experimental async iterator support for `for await (x of stream)`
       loops. */
    [Symbol.asyncIterator] = async function*() {
        // Buffer for synchronous values
        const values = [];
        let push = (value) => values.push(value);

        function setResolve(res, rej) {
            push = res;
        }

        this
        .each((value) => push(value))
        .done(() => push = noop);

        while (push !== noop) {
            yield values.length ?
                // Yield collected synchronous value
                values.shift() :
                // Yield next asynchronous value
                await new Promise(setResolve) ;
        }
    }

    static from = overload(toType, {
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
    });

    /**
    Stream.of(...values)
    Create a pushable value or buffer stream from parameter values.
    **/
    static of(...values) {
        return values.length < 2 ?
            new Value(values[0]) :
            new BufferStream(values) ;
    }

    /**
    Stream.buffer(...values)
    Create a pushable buffer stream with initial buffer of arguments.
    **/
    static buffer(values) {
        return new BufferStream(values);
    }

    /**
    Stream.value(value)
    Create a pushable value stream with initial `value`.
    **/
    static value(value) {
        return new Value(value);
    }

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream. Values are emitted in the time order they are received
    from inputs.

    ```js
    Stream.merge(stream1, stream2).each((value) => {
        // value is from stream1 or stream 2
    });
    ```
    **/
    static merge(...inputs) {
        return new Merge(inputs);
    }

    /**
    Stream.push(stream, value)
    Pushes `value` to `stream`'s outputs (even on streams that have no `.push()`
    method). For use in sub-classing Stream.
    **/
    static push = push;

    /**
    Stream.stop(stream)
    Stops stream, calling `.done()` handlers, setting status to `'done'` and
    stopping dependent streams. For internal use when sub-classing Stream.
    **/
    static stop = stop;

    /*
    Stream.input(stream, output)
    Remove output stream from `stream` and vice-versa, without stopping either
    stream. Normally `stream.stop()` should be used to stop the flow of a pipe -
    this function is used when making dynamic graphs of streams that need to
    stay alive.
    */
    static unpipe = unpipe;

    static each(fn) {
        return new Each(fn);
    }

    static reduce(fn, accumulator) {
        return new Reduce(fn, accumulator);
    }
}


/**
PromiseStream(promise)
**/

class PromiseStream extends Stream {
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

class Value extends Stream {
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

class BufferStream extends Stream {
    constructor(values) {
        super();
        this.values = values || [];
    }

    start() {
        const values = this.values;
        if (!values) return super.start();

        // Loop over values
        let n = -1;
        while(n++ < values.length) {
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

class Filter extends Stream {
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

class FlatMap extends Stream {
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
            // This causes problems if you try
            // stream.scan(...).flatMap(...)
            //values.pipe(this[0]);
        }
        // Flatten promise
        else if (values.then) {
            values.then((value) => push(this, value));
        }
    }
}


/* Map() */

class Map extends Stream {
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


/*
Merge()
*/

class Merge extends Stream {
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
        return Stream.prototype.pipe.call(this, output)
    }
}


/* Scan() */

class Scan extends Stream {
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

class Slice extends Stream {
    constructor(n, m = Infinity) {
        if (window.DEBUG && (typeof n !== 'number' || n < 0)) {
            throw new Error('Stream: .slice() requires a positive integer (' + n + ')');
        }

        if (window.DEBUG && (typeof m !== 'number' || m < 1)) {
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

class Split extends Stream {
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
