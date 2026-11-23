
import noop     from '../noop.js';
import Stopable from './stopable.js';


const define = Object.defineProperty;

export const cold = Symbol('cold');


export function push(stream, value) {
    if (value === undefined) return;
    let n = 0;
    let output;
    while (output = stream[n]) {
        output.push(value);
        // Preserve attachment order without skipping siblings when an output
        // stops or unpipes itself during push() and removeOutput() shifts
        // subsequent outputs down into slot n.
        if (stream[n] === output) n++;
    }
    return stream;
}

export function stop(stream) {
    // Call done functions and listeners
    Stopable.prototype.stop.apply(stream);

    // Loop through outputs, detach and propagate stop() to cold streams / consumers
    let o = -1, output;
    while (output = stream[++o]) {
        // Remove output from stream
        stream[o] = undefined;
        // If output is not stop-able it never got stream as an input
        if (!output.stop) continue;
        // Remove stream from output's inputs
        removeInput(output, stream);
        // Auto-stop cold streams and cold consumers when no inputs remain;
        // leave hot Consumers and Streams alive.
        if (!output[-1] && output[cold]) {
            output.stop();
        }
    }

    return stream;
}

export function removeInput(stream, input) {
    // Remove input from stream
    let i = 0;
    while (stream[--i] && stream[i] !== input);
    while (stream[i--]) stream[i + 1] = stream[i];
}

export function removeOutput(stream, output) {
    // Remove output from stream
    let o = -1;
    while (stream[++o] && stream[o] !== output);
    while (stream[o++]) stream[o - 1] = stream[o];
}

export function unpipe(output, input) {
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

            // Auto-stop cold upstream streams when their last output detaches;
            // hot Streams stay alive when consumers detach.
            if (input[cold] && !input[0]) input.stop();
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

// Mark Each and Reduce as cold consumers so they auto-stop when their
// upstream stream stops, while plain Consumer subclasses stay hot.
define(Each.prototype,   cold, { value: true });
define(Reduce.prototype, cold, { value: true });


/**
Stream()
A hot, persistent stream. Piping to a `Stream` wires outputs immediately without
starting or stopping the stream; detaching consumers does not stop a hot
`Stream`, nor does stopping an upstream stream stop a downstream hot `Stream`.

For lazy, pull-to-start streams that auto-start on first consumer and auto-stop
when their last consumer detaches, use `ColdStream` or `Stream.cold(start)`.
**/

export default class Stream extends Consumer {
    /**
    .stop()
    Stops this stream, detaching from inputs and outputs. Downstream cold
    streams and cold consumers with no remaining inputs are stopped
    automatically; downstream hot Consumers and Streams stay alive.
    **/
    stop() {
        if (this.status === 'done') return this;

        super.stop();

        // Loop through outputs, detach and propagate stop() to cold streams / consumers
        let o = -1, output;
        while (output = this[++o]) {
            // Remove output from this
            this[o] = undefined;
            // If output is not stop-able it never got this as an input
            if (!output.stop) continue;
            // Remove this from output's inputs
            removeInput(output, this);
            // Auto-stop cold streams and cold consumers when no inputs remain;
            // leave hot Consumers and Streams alive.
            if (!output[-1] && output[cold]) {
                output.stop();
            }
        }

        return this;
    }

    /**
    .pipe(output)
    Connects this stream to `output`. If `output` is a cold stream that has not
    yet started, defers wiring until `output.start()` runs; otherwise wires
    immediately. Returns `output`.
    **/
    pipe(output) {
        // If output is stop-able set this as its input
        if (output.stop) {
            // Guard against this piping twice to output
            let i = 0;
            while (output[--i]) if (output[i] === this) break;
            output[i] = this;
        }

        // If output is a cold stream and is not already running, wait for
        // output.start() to attach it to this
        if (output[cold] && output.start && !(output[0] || output.status === 'running')) {
            return output;
        }

        // Wire immediately
        let o = -1;
        while (this[++o]) if (this[o] === output) break;
        this[o] = output;

        // Return output
        return output;
    }

    /**
    .unpipe(output)
    Disconnects `output` from this stream without stopping either stream.
    Returns `this`.
    **/
    unpipe(output) {
        unpipe(this, output);
        return this;
    }

    /**
    .each(fn)
    Consumes the stream, calling `fn(value)` for each piped value. Returns the
    consumer.
    **/
    each(fn) {
        // Start the Consumer immediately
        return this.pipe(new Each(fn));
    }

    /**
    .reduce(fn, initial)
    Consume the stream, calling `fn(accumulator, value)` for each value in it.
    Returns the accumulator.
    **/
    reduce(fn, accumulator) {
        return this.pipe(new Reduce(fn, accumulator)).value;
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

    /**
    Stream.push(stream, value)
    Pushes `value` to `stream`'s outputs (even on streams that have no `.push()`
    method). For use in sub-classing Stream.
    **/
    static push = push;

    /**
    Stream.stop(stream)
    Stops stream, calling `.done()` handlers, setting status to `'done'` and
    stopping dependent cold streams and consumers. For internal use when
    sub-classing Stream.
    **/
    static stop = stop;

    /**
    Stream.unpipe(stream, output)
    Remove `output` from `stream` and vice-versa, without stopping either
    stream.
    **/
    static unpipe = unpipe;

    static each(fn) {
        return new Each(fn);
    }

    static reduce(fn, accumulator) {
        return new Reduce(fn, accumulator);
    }
}
