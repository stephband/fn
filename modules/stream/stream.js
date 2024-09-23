
import isIterable from '../is-iterable.js';
import nothing    from '../nothing.js';
import noop       from '../noop.js';
import overload   from '../overload.js';
import toType     from '../to-type.js';

const assign     = Object.assign;
const create     = Object.create;
//const $input     = Symbol('input');
const $listeners = Symbol('done');

const call = overload(toType, {
    function: (fn) => fn(),
    object:   (object) => object.stop()
});

/**
pipe(stream)
Connect stream to output. Sets up `stream[0]` and `output[-1]` (if output is
`.stop()`able).
**/

export function pipe(stream, output) {
    // For internal objects `output[-1] === stream` already, but for other
    // streams it doesn't have a reference to input, so it doesn't participate
    // in the flow of .stop() unless we give it one. Let's use existence of
    // .stop() to determine need for output[-1], to avoid us setting
    // array[-1], for example, in case the consumer is an array.
    if (output.stop) output[-1] = stream;

    // Add to outputs
    return stream[0] = output;
}


/*
unpipe(streams, output)
Internal, part of the stop cycle. Disconnects output from stream.
*/

export function unpipe(stream, output) {
    let n = -1;
    let o;

    // Find stream[n] that matches `output`
    while (stream[++n] && stream[n] !== output);

    if (window.DEBUG && !stream[n]) {
        throw new Error('Stream: Cannot unpipe(), `output`, not an output of `stream`');
    }

    // Stop responding to stop() and start() on output
    output[-1] = undefined;

    // Decrement output n of higher number outputs
    while (stream[n++]) {
        stream[n - 1] = stream[n];
    }

    return output;
}


/**
stop()
Stops a stream and all downstream streams. This calls the `done` listeners.
**/

export function stop(stream) {
    // Check and set status
    if (stream.status === 'done') {
        if (window.DEBUG) {
            console.log(stream);
            throw new Error('Stream: cannot stop() stream that is done');
        }
        return stream;
    }

    stream.status = 'done';

    // If stream has not yet been piped, we don't call done() functions
    // for streams that have not been consumed. The problem with
    // stream[0] on its own is that it's `false` for an Each stream
    // or other consumer. The way to identify a consumer is that it
    // does not have a .pipe().
    if (stream.pipe && !stream[0]) { return stream; }

    // Call done functions and listeners
    const listeners = stream[$listeners];
    stream[$listeners] = undefined;

    if (listeners) {
        listeners.forEach(call);
    }

    // Unpiping output 0 decrements other outputs, so this loops through
    // all outputs, in case it's a broadcast stream. Check it is stoppable,
    // avoid trying to stop arrays
    while (stream[0]) {
        if (Array.isArray(stream[0])) {
            unpipe(stream, stream[0]);
        }
        else {
            stop(unpipe(stream, stream[0]));
        }
    }

    return stream;
}


/**
Stream(pipeable)
A `pipeable` is an object with `.pipe()` and `.stop()` methods, and optionally
`.start()`.
**/

/**
Stream(fn)
Passing a function to `Stream()` creates a readable stream. The function `fn`
is called when a consumer is first attached to the stream. It is passed two
arguments, `push()`, used to write to the stream, and `stop()`, used to stop
the stream.
**/

const readable = {
    pipe: function(output) {
        // Connect stream to output
        pipe(this, output);

        // Call fn(push, stop)
        this.fn(
            (value) => Stream.prototype.push.call(this, value),
            () => this.stop()
        );

        // Return output stream
        return output;
    },

    push: null,

    stop: function() {
        return this.status === 'done' ?
            this :
            stop(this) ;
    }
};

export default function Stream(pipeable) {
    const type = typeof pipeable;

    if (type === 'object') {
        // Set pipeable as input
        this[-1] = pipeable;
    }
    else if (type === 'function') {
        // Store function
        this.fn = pipeable;
        // Configure stream as a readonly stream
        assign(this, readable);
    }
    else if (window.DEBUG) {
        throw new Error('new Stream() may be called with a pipeable object or a function');
    }
}

assign(Stream, { pipe, stop });

assign(Stream.prototype, {
    /**
    .push(value)
    Pushes `value` into the stream. If the stream has not been started or is
    already stopped this will cause an error.
    **/
    push: function(value) {
        // Do we need the guard??
        return this[0] && this[0].push(value);
    },

    /**
    .each(fn)
    Consume the stream, calling `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        return this.pipe(new Each(this, fn));
    },

    /**
    .pipe(stream)
    Starts a stream and pushes its values into `stream`. Returns `stream`.
    **/
    pipe: function(output) {
        if (window.DEBUG && this[0]) {
            throw new Error('Stream: cannot .pipe() a unicast stream more than once');
        }

        if (window.DEBUG && !output.push) {
            throw new Error('Stream: attempt to .pipe() to non-pushable object');
        }

        // Connect this to output (sets this[0] and output[-1])
        pipe(this, output);

        // Tell input to .pipe(), so pipe goes back up the chain
        this[-1].pipe(this);
        return output;
    },

    /**
    .broadcast(options)
    Returns a broadcast stream. Methods called on this stream each create new
    child streams. The first time a consumer is attached to one of these streams
    the broadcast stream is piped, and the last consumer to be stopped stops the
    broadcast stream.

    A broadcast stream may have memory, where newly created consumers
    immediately receive the latest value of the broadcaster when attached
    (assuming that value is not `undefined`):

    ```js
    const broadcaster = stream.broadcast({ memory: true });
    ```
    **/
    broadcast: function(options) {
        return new Broadcast(this, options);
    },

    /**
    .filter(fn)
    Filters out values where `fn(value)` is falsy.
    **/
    /*
    .filter(stream)
    Filters out values where the latest value of `stream` is falsy.
    */
    filter: function(fn) {
        /*return typeof fn === 'function' ?
            new Filter(this, fn) :
            new StreamFilter(this, fn) ;*/
        return new Filter(this, fn);
    },

    /**
    .flatMap(fn)
    **/
    flatMap: function(fn) {
        return new FlatMap(this, fn);
    },

    /**
    .map(fn)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    map: function(fn) {
        //return pipe(this, new Map(this, fn));
        //return this.pipe(new Map(this, fn));
        return new Map(this, fn);
    },

    /**
    .reduce(fn, initial)
    Consume the stream, calling `fn(accumulator, value)` for each value in it.
    Returns the accumulator.
    **/
    reduce: function(fn, accumulator) {
        return this.pipe(new Reduce(fn, accumulator)).value;
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
    .slice(n, m)
    Returns a stream of the nth to mth values of stream.
    **/
    slice: function(n, m) {
        return new Slice(this, n, m);
    },

    /**
    .split(n)
    **/
    split: function(n) {
        return new Split(this, n);
    },

    /**
    .start()
    Out of the box, `.start()` does nothing. Actually, it errors if a '.start()'
    is not implemented at the head of the stream. The method is provided as a
    way to build timed streams. It echoes its arguments to the stream head
    `.start()`, so the head determines whether `.start()` is supported.
    **/
    start: function() {
        if (this.status === 'done') { return this; }
        this[-1].start.apply(this[-1], arguments);
        return this;
    },

    /**
    .stop()
    Stops the stream.
    **/
    stop: function() {
        // Check status
        if (this.status === 'done') { return this; }

        // Does input have more than 1 output? ie, is it a multicast or
        // broadcast stream? Don't stop it, unpipe() this from it, and
        // stop `this`.
        if (this[-1][1]) {
            unpipe(this[-1], this);
            return stop(this);
        }

        // Otherwise delegate stop() up the chain
        this[-1].stop.apply(this[-1], arguments);
        return this;
    },

    /**
    .done(fn)
    Cues `fn` to be called when the stream is stopped.
    **/
    done: function(listener) {
        // Is stream already stopped? Call listener immediately.
        if (this.status === 'done') {
            call(listener);
            return this;
        }

        const listeners = this[$listeners] || (this[$listeners] = []);
        listeners.push(listener);
        return this;
    },

    /* Experimental async iterator support for `for await (x of stream)`
       loops. */
    [Symbol.asyncIterator]: async function*() {
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
});


/*
Broadcast(pipeable, options)
A Broadcast stream may be piped to multiple outputs. The options object has
the optional properties:

```js
{
    // Remember and send the latest value to newly attached pipes
    memory: true,

    // Start the stream immediately, and keep it alive after output streams are
    // removed, allowing you to attach new outputs. This stream can only be
    // stopped by explicitly calling `.stop()` on it. TODO: is this still true
    // in Stream v3?
    hot: true
}
```
*/

export function Broadcast(pipeable, options) {
    //Stream.apply(this, arguments);
    this[-1] = pipeable;

    // Mark this stream as a memory stream
    this.memory = !!(options && options.memory);

    // Open the stream immediately and keep it live even without outputs by
    // sending output 0 to nothing. It can now only be stopped by explicitly
    // calling .stop() on it, and not by stopping child streams.
    if (options && options.hot) {
        this.pipe({ push: noop });
    }
}

Broadcast.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        // Reject undefined
        if (value === undefined) { return; }

        // If this is a memory stream keep value
        if (this.memory) {
            this.value = value;
        }

        let n = -1;
        while (this[++n]) {
            // TODO: should this push cause a child to .stop() and remove
            // itself... we have a problem...
            this[n].push(value);
        }
    },

    pipe: function(output) {
        let n = -1;
        while (this[++n]);

        // If this is a memory stream and this is the first output, flush the
        // pipe. But we don't have any outputs yet! I know, but the latest value
        // is remembered and it gets pushed to output below.
        if (this.memory && n === 0) {
            this[-1].pipe(this);
        }

        if (output.stop && output !== nothing) { output[-1] = this; }
        this[n] = output;

        // If stream has value already, it is a memory stream
        if (this.value !== undefined) {
            output.push(this.value);
        }

        // If not a memory stream and this is the first output start the pipeline
        if (!this.memory && n === 0) {
            this[-1].pipe(this);
        }

        return output;
    }
});


/* Each() */

function Each(input, fn) {
    this[-1] = input;
    this.push  = fn;
}

Each.prototype = assign(create(Stream.prototype), {
    // Each is a consumer
    pipe: null
});


/* Filter() */

function Filter(input, fn) {
    this[-1] = input;
    this.fn    = fn;
}

Filter.prototype = assign(create(Stream.prototype), {
    push: function filter(value) {
        const fn = this.fn;
        const is = fn(value);
        is && this[0].push(value);
    }
});


/* FlatMap() */

function FlatMap(input, fn) {
    this[-1] = input;
    this.fn    = fn;
}

FlatMap.prototype = assign(create(Stream.prototype), {
    push: function flatMap(value) {
        const fn     = this.fn;
        const values = fn(value);

        if (values === undefined) { return; }

        // Flatten array or array-like
        if (isIterable(values)) {
            for (const value of values) {
                this[0].push(value);
            }
        }
        // Flatten stream
        else if (values.pipe) {
            console.warn('FlatMapping pipeables is dodgy. Map to arrays for the moment please.');
            // Todo: support flattening of streams. This method is crude -
            // it does not preserve order, for one thing. Should streams be
            // made iterable? CAN streams be made iterable? They'd have to
            // be async...
            this.done(values.each((value) => this[0].push(value)));
            // This causes problems if you try
            // stream.scan(...).flatMap(...)
            //values.pipe(this[0]);
        }
        // Flatten promise
        else if (values.then) {
            values.then((value) => this[0].push(value));
        }
    }
});


/* Map() */

function Map(input, fn) {
    this[-1] = input;
    this.fn    = fn;
}

Map.prototype = assign(create(Stream.prototype), {
    push: function map(value) {
        const fn     = this.fn;
        const result = fn(value);
        // Reject undefined, return false... why?
        return result === undefined || !this[0] ?
            false :
            this[0].push(result) ;
    }
});


/* Reduce() */

function Reduce(fn, accumulator) {
    this.fn    = fn;
    this.value = accumulator;
    this.i     = 0;
}

Reduce.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const fn = this.fn;
        this.value = fn(this.value, value, this.i++, this);
    }
});


/* Scan() */

function Scan(input, fn, accumulator) {
    this[-1] = input;
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


/* Slice() */

function Slice(input, n, m = Infinity) {
    if (window.DEBUG && (typeof n !== 'number' || n < 0)) {
        throw new Error('Stream: .slice() requires a positive integer (' + n + ')');
    }

    if (window.DEBUG && (typeof m !== 'number' || m < 1)) {
        throw new Error('Stream: .slice() requires a non-zero positive integer (n, ' + n + ')');
    }

    this[-1]    = input;
    this.index    = -n;
    this.indexEnd = n + m;
}

Slice.prototype = assign(create(Stream.prototype), {
    push: function take(value) {
        if (++this.index > 0) {
            this[0].push(value);
        }

        if (this.index === this.indexEnd) {
            this.stop();
        }
    }
});


/* Split(input, fn) */

function Split(input, fn) {
    this[-1] = input;
    this.chunk = [];

    if (typeof n === 'number') {
        this.n = fn;
    }
    else {
        this.fn = fn;
    }
}

Split.prototype = assign(create(Stream.prototype), {
    fn: function() {
        return this.chunk.length === this.n;
    },

    push: function map(value) {
        const chunk = this.chunk;

        if (this.fn(value)) {
            // Emit complete chunk and create a new chunk
            this[0].push(chunk);
            this.chunk = [];
        }
        else {
            // Push to existing chunk
            chunk.push(value);
        }
    }
});
