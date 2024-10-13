
//import nothing    from '../nothing.js';
import noop       from '../noop.js';
import overload   from '../overload.js';
import toType     from '../to-type.js';

const assign     = Object.assign;
const create     = Object.create;
const $listeners = Symbol('done');

const call = overload(toType, {
    function: (fn) => fn(),
    object:   (object) => object.stop()
});

function throwTypeError(source) {
    throw new TypeError('Stream cannot be created .from() ' + typeof source);
}

function push(stream, value) {
    if (value === undefined) return;
    let n = -1;
    while (stream[++n]) stream[n].push(value);
}

function stop(stream) {
    // Set status
    stream.status = 'done';

    // Call done functions and listeners
    const listeners = stream[$listeners];
    stream[$listeners] = undefined;
    if (listeners) listeners.forEach(call);

    // Loop through outputs, propagate stop() down the pipe
    let o = -1, output;
    while (output = stream[++o]) {
        // Remove output from this
        stream[o] = undefined;
        // Remove this from output's inputs
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

function Consumer(fn) {
    this.push = fn;
}

assign(Consumer.prototype, {
    /**
    .start()
    The `.start()` method is provided as a way to build timed streams. It echoes
    its arguments to the stream head `.start()`, so the head determines whether
    the stream starts immediately or asynchronously.
    **/
    start: function() {
        if (this.status === 'done') return this;

        // Loop through inputs
        let i = 0, input;
        while (input = this[--i]) {
            // Loop through input's outputs
            let o = -1;
            while (input[++o]) if (input[o] === this) break;
            input[o] = this;
            /* If we don't qualify this, all producers must have a start method
               SHOULD WE DO THAT?*/
            if (input.start) input.start.apply(input, arguments);
        }

        return this;
    },

    /**
    .stop()
    Stops the stream, passing any parameters up to the head of the stream. The
    head determines whether the stream stops immediately or asynchronously.
    **/
    stop: function() {
        if (this.status === 'done') return this;

        // Loop through inputs, track inputs that this stop depends on
        let input;
        while (input = this[-1]) {
            // Remove input from this
            let i = -1;
            while (this[i--]) this[i + 1] = this[i];

            // Input is not a stoppable (I don't think this should happen?).
            if (!input.stop) {console.log('This shouldn\'t happen?');continue;}

            // If input has no other outputs, stop it
            if (!input[1]) {
                // Call .stop() and quit the process to wait until input calls
                // .stop() on this once again – which may happen synchronously
                // or asynchronously
                input.stop.apply(input, arguments);
                return this;
            }

            // Input has more than one output, remove this from input's outputs
            removeOutput(input, this);
        }

        return stop(this);
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
    }
});


/* Reduce() */

function Reduce(fn, accumulator) {
    this.fn    = fn;
    this.value = accumulator;
    this.i     = 0;
}

Reduce.prototype = assign(create(Consumer.prototype), {
    push: function(value) {
        const fn = this.fn;
        this.value = fn(this.value, value, this.i++, this);
    }
});


/**
Stream(start)
Creates a stream from a `start` function, called when a consumer is first
attached, with two arguments, `start(push, stop)`. `push(value)` is called to
write `value` to the stream and `stop()` is called to stop the stream.
**/

export default function Stream(fn) {
    if (typeof fn === 'function') {
        this.start = function() {
            const pushFn = (value) => push(this, value);
            const stopFn = (...args) => this.stop.apply(this, args);
            fn(pushFn, stopFn, ...arguments);
            return this;
        };
    }
    else {
        throw new TypeError('new Stream() cannot be created from ' + typeof fn);
    }
}

assign(Stream.prototype, Consumer.prototype, {
    /**
    .pipe(stream)
    Starts a stream and pushes its values into `stream`. Returns `stream`.
    **/
    pipe: function(output) {
        // If output is stoppable set this as its input
        if (output.stop) {
            // Guard against this piping twice to output
            let i = 0;
            while (output[--i]) if (output[i] === this) break;
            output[i] = this;

            // if output is a cold pipeable go no further
            if (output.pipe && !output[0]) return output;
        }

        // It must be a consumer (or a hot pipeable), start this immediately
        let o = -1;
        while (this[++o]) if (this[o] === output) break;
        this[o] = output;
        this.start();

        // Return output
        return output;
    },

    /**
    .each(fn)
    Consumer the stream, calling `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        // Start the consumer immediately
        return this.pipe(new Consumer(fn));
    },

    /**
    .buffer(...values)
    Inserts a buffer of values into the start of a stream. Although the buffer
    is not hot, before it is started .push() may be used to add values to the
    buffer.
    **/
    buffer: function(...values) {
        return this.pipe(new Buffer(values));
    },

    /**
    .filter(fn)
    Filters out values where `fn(value)` is falsy.
    **/
    filter: function(fn) {
        return this.pipe(new Filter(fn));
    },

    /**
    .flatMap(fn)
    **/
    flatMap: function(fn) {
        return this.pipe(new FlatMap(fn));
    },

    /**
    .map(fn)
    Maps each value in a stream to `fn(value)` and pipes non-`undefined` results
    downstream.
    **/
    map: function(fn) {
        return this.pipe(new Map(fn));
    },

    /**
    .reduce(fn, initial)
    Consumer the stream, calling `fn(accumulator, value)` for each value in it.
    Returns the accumulator.
    **/
    reduce: function(fn, accumulator) {
        return this.pipe(new Reduce(fn, accumulator)).start().value;
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan: function(fn, initial) {
        return this.pipe(new Scan(fn, initial));
    },

    /**
    .slice(n, m)
    Returns a stream of the nth to mth values of stream.
    **/
    slice: function(n, m) {
        return this.pipe(new Slice(n, m));
    },

    /**
    .split(n)
    **/
    split: function(n) {
        return this.pipe(new Split(n));
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


/**
PromiseStream(promise)
**/

function PromiseStream(promise) {
    this.promise = promise;
}

PromiseStream.prototype = assign(create(Stream.prototype), {
    start: function() {
        this.promise
        .then((value) => push(this, value))
        .finally(() => this.stop());
        return this;
    }
});


/*
Buffer(values)
A Buffer stream may be pushed to before it is piped, as it starts life with an
array buffer of values.
*/

function Buffer(values) {
    this.values = values || [];
}

Buffer.prototype = assign(create(Stream.prototype), {
    start: function() {
        const values = this.values;

        if (!values) return Stream.prototype.start.apply(this);

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
        return Stream.prototype.start.apply(this);
    },

    push: function(value) {
        return this.values ?
            this.values.push(value) :
            push(this, value) ;
    }
});


/* Filter() */

function Filter(fn) {
    this.fn = fn;
}

Filter.prototype = assign(create(Stream.prototype), {
    push: function filter(value) {
        const fn = this.fn;
        return fn(value) && push(this, value);
    }
});


/* FlatMap() */

function FlatMap(fn) {
    this.fn = fn;
}

FlatMap.prototype = assign(create(Stream.prototype), {
    push: function flatMap(value) {
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
});


/* Map() */

function Map(fn) {
    this.fn = fn;
}

Map.prototype = assign(create(Stream.prototype), {
    push: function map(value) {
        const fn     = this.fn;
        const result = fn(value);
        // Reject undefined
        return result !== undefined && push(this, result);
    }
});


/*
Merge()
*/

function Merge(inputs) {
    this.inputs = inputs;
}

Merge.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        return push(this, value);
    },

    pipe: function(output) {
        let n = -1, input;
        while (input = this.inputs[++n]) {
            if (input.pipe) input.pipe(this) ;
            else Stream.from(input).pipe(this) ;
        }

        return Stream.prototype.pipe.call(this, output)
    }
});


/* Scan() */

function Scan(fn, accumulator) {
    this.fn    = fn;
    this.value = accumulator;
}

Scan.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const fn = this.fn;
        this.value = fn(this.value, value);
        push(this, this.value);
    }
});


/* Slice() */

function Slice(n, m = Infinity) {
    if (window.DEBUG && (typeof n !== 'number' || n < 0)) {
        throw new Error('Stream: .slice() requires a positive integer (' + n + ')');
    }

    if (window.DEBUG && (typeof m !== 'number' || m < 1)) {
        throw new Error('Stream: .slice() requires a non-zero positive integer (n, ' + n + ')');
    }

    this.index    = -n;
    this.indexEnd = n + m;
}

Slice.prototype = assign(create(Stream.prototype), {
    push: function take(value) {
        if (++this.index > 0) {
            push(this, value);
        }

        if (this.index === this.indexEnd) {
            this.stop();
        }
    }
});


/* Split(input, fn) */

function Split(fn) {
    this.chunk = [];

    if (typeof fn === 'number') this.n = fn;
    else this.fn = fn;
}

Split.prototype = assign(create(Stream.prototype), {
    fn: function() {
        return this.chunk.length === this.n;
    },

    push: function map(value) {
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
            Create a read-only stream from a producer, an object with a
            `.pipe()` method. ???
            **/
            typeof object.pipe === 'function' ? object.pipe(Stream.of()) :

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
            typeof object.length === 'number' ? new Buffer(Array.from(values)) :

            // object cannot be made into stream
            throwTypeError(object)
    }),

    /**
    Stream.of(...values)
    Create a pushable buffer stream from parameter values.
    **/
    of: (...values) => new Buffer(values),

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
    merge: (...inputs) =>  new Merge(inputs),

    /*
    Stream.push(stream, value)
    Pushes `value` to `stream`'s outputs. For internal use when sub-classing Stream.
    */
    push,

    /*
    Stream.stop(stream)
    Stops stream, calling `.done()` handlers, setting status to `'done'` and
    stopping dependent streams. For internal use when sub-classing Stream.
    */
    stop,

    /*
    Stream.input(stream, output)
    Remove output stream from `stream` and vice-versa, without stopping either
    stream. Normally `stream.stop()` should be used to stop the flow of a pipe -
    this function is used when making dynamic graphs of streams that need to
    stay alive.
    */
    unpipe,

    Each: Consumer
});
