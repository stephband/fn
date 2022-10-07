
import { remove } from '../remove.js';
import isIterable from '../is-iterable.js';
import Stopable   from './stopable.js';

const assign = Object.assign;
const create = Object.create;


/* Connections */

export function pipe(input, output) {
    input[0] = output;
    output.done(input);
}

export function unpipe(input, n) {
    const stopables = input[n].stopables;
    stopables && remove(stopables, input);
    input[n] = undefined;
}

export function push(stream, value) {
    stream && stream.push(value);
}

export function stop(stream) {
    // TODO: the whole logic around stopping makes me a little queasy. This does
    // not guarantee a sensible order, and in a pipeline stream stop is called
    // more than once per stream (we protect against recursion inside Stopable).
    // I feel there must be a better way. It's not immediately evident to me
    // though.

    // Call done functions
    Stopable.prototype.stop.apply(stream);

    let n = -1;
    let output;
    while (output = stream[++n]) {
        stream[n] = undefined;
        output.stop();
    }
}


/* Stream */

export default function Stream(producer) {
    this.input = producer;
}

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

        push(this[0], value);
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
        output.done(this);

        // Start pulling values
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
    Filters out values where `fn(value)` is falsy.
    **/

    /**
    .filter(stream)
    Filters out values where the latest value of `stream` is falsy.
    **/
    filter: function(fn) {
        /*return typeof fn === 'function' ?
            new Filter(this, fn) :
            new StreamFilter(this, fn) ;*/
        return new Filter(this, fn);
    },

    /**
    .split(n)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    split: function(n) {
        return new Split(this, n);
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
    Consume the stream, calling `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        return this.pipe(new Each(fn));
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
    .stop()
    Stops the stream.
    **/
    stop: function() {
        // We send to unpipe() to support broadcast streams, a unicast stream
        // at input only requires this.input.stop()
        //unpipe(this.input, this);
        stop(this);
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
        const result = fn(value);

        // Reject undefined results
        if (result !== undefined) {
            push(this[0], result);
        }
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
        is && push(this[0], value);
    }
});


/* StreamFilter */

/*
function setCondition(stream, value) {
    stream.condition = value;
    return stream;
}

function StreamFilter(input, stream) {
    this.input     = input;
    this.condition = false;
    this.done(stream);
    stream.reduce(setCondition, this);
}

StreamFilter.prototype = assign(create(Stream.prototype), {
    push: function filter(value) {
        this.condition && push(this, value);
    }
});
*/

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
                    push(this[0], value);
                }
            }
            else if (values.pipe) {
                // Todo: support flattening of streams. This method is crude -
                // it does not preserve order, for one thing. Should streams by
                // made iterable? CAN streams be made iterable? They'd have to
                // be async...
                this.done(values.each((value) => push(this[0], value)));
                // This causes problems if you try
                // stream.scan(...).flatMap(...)
                //values.pipe(this[0]);
            }
        }
    }
});


/* Split */

function Split(input, fn) {
    this.input = input;
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
            push(this[0], chunk);
            this.chunk = [];
        }
        else {
            // Push to existing chunk
            chunk.push(value);
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


/* Reduce */

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

function Each(fn) {
    this.push = fn;
}

Each.prototype = assign(create(Stream.prototype), {
    each:   null,
    reduce: null,
    pipe:   null
});
