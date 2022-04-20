
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
    of: function() {
        return new Stream(new BufferProducer(arguments));
    },

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
    push: function(value) {
        if (this[0]) {
            push(this, value);
        }
        else {
            // What is the best way to handle a stopped stream that is still being pushed to?
            // Should this be inside the push fucntion?
            // What happens when a stream is stopped from a broadcaster
            console.log('TODO: review, no output 0!');
        }
    },

    pipe: function(output) {
        if (this[0]) {
            throw new Error('Attempt to multicast a unicast stream. Create a multicast stream with stream.broadcast().');
        }

        this[0] = output;
        this.input.pipe(this);
        return output;
    },

    map: function(fn) {
        return new Map(this, fn);
    },

    filter: function(fn) {
        return new Filter(this, fn);
    },

    take: function(n) {
        return new Take(this, n);
    },

    each: function(fn) {
        return new Each(this, fn);
    },

    reduce: function(fn, initial) {
        return new Reduce(this, fn, initial);
    },

    scan: function(fn, initial) {
        return new Scan(this, fn, initial);
    },

    stop: function() {
        // We send to unpipe() to support broadcast streams, a unicast stream
        // at input only requires this.input.stop()
        unpipe(this.input, this);
        return this;
    }
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
                    if (value !== undefined) {
                        push(this, value);
                    }
                }
            }
            else {
                // Todo: support flattening of streams. Should streams by made
                // iterable? CAN streams be made iterable? They'd have to be async?
                throw new Error('Cannot .flatMap() non-iterable values');
            }
        }
    }
});


/* Take */

function Take(input, n) {
    if (window.DEBUG && (typeof n !== 'number' || n < 1)) {
        throw new Error('stream.take(n) accepts non-zero positive integers as n (' + n + ')');
    }

    this.input = input;
    this.count = n;
}

Take.prototype = assign(create(Stream.prototype), {
    push: function take(value) {
        push(this, value);
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
        const fn   = this.fn;
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
        const fn          = this.fn;
        const accumulator = fn(this.value, value);
        push(this, accumulator);
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
