
import Stopable from './stopable.js';
import Stream, { Map, Filter, FlatMap, Reduce, Scan, Take, Each } from './stream.js';

const create = Object.create;
const assign = Object.assign;

/**
Source
**/

function Source(source) {
    this.source = source;
    this.target = undefined;
}

assign(Source.prototype, Stopable.prototype, {
    start: function() {
        const source  = this.source;
        const targets = source.targets;
        const target  = this.target;

        // Add this target to distributor targets
        targets.push(target);

        // Push initial value
        if (source.value !== undefined) {
            target.push(this.source.value);
        }

        if (targets.length === 1) {
            //this.source.start();
            this.source.source.pipe(this.source);
        }
    },

    stop: function() {
        const targets = this.source.targets;
        const target  = this.target;

        // Get index of target
        const i = targets.indexOf(target);

        // Splice it out
        targets.splice(i, 1);

        // Stop this stream
        Stopable.prototype.stop.apply(this, arguments);

        // If there are no targets left stop the distributor
        if (targets.length === 0) {
            this.source.stop();
        }
    }
});


/**
Distributor(source, memorise)
Where `source` is a source stream and `memorise` is an optional boolean that
tells the distributor to emit latest value as the initial value of a newly
created forked stream.
**/

export default function Distributor(source, memorise) {
    if (window.DEBUG && !source) {
        throw new Error('Distributor() requires a source');
    }

    this.source   = source;
    this.targets  = [];
    this.memorise = !!memorise;
}

Distributor.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const targets = this.targets;

        // If there is no target the stream has not been started yet
        if (window.DEBUG && !targets.length) {
            console.warn('Attempt to .push() to idle distributor', value);
        }

        if (value !== undefined) {
            let t = -1;
            while (targets[++t]) {
                targets[t].push(value);
            }

            // Memorise value so that newly forked streams may be initialised
            // with latest value
            if (this.memorise) {
                this.value = value;
            }
        }

        return this;
    },

    pipe: function(stream) {
        console.log('TODO: Distributor.pipe()');
        return stream;
    },

    /**
    .map(fn)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    map: function(fn) {
        const source = new Source(this);
        return new Map(source, source, fn);
    },

    /**
    .filter(fn)
    Filters out values from the stream where `fn(value)` is falsy.
    **/
    filter: function(fn) {
        const source = new Source(this);
        return new Filter(source, source, fn);
    },

    /**
    .flatMap(fn)
    **/
    flatMap: function(fn) {
        const source = new Source(this);
        return new FlatMap(source, source, fn);
    },

    /**
    .reduce(fn, initial)
    Consumes the stream. TODO: Not sure what to return old boy.
    **/
    reduce: function(fn, initial) {
        const source = new Source(this);
        return new Reduce(source, source, fn, initial);
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan: function(fn, accumulator) {
        const source = new Source(this);
        return new Scan(source, source, fn, accumulator);
    },

    /**
    .take(n)
    Returns a stream of the first `n` values of the stream.
    **/
    take: function(n) {
        const source = new Source(this);
        return new Take(source, source, n);
    },

    /**
    .each(fn)
    Starts the stream and calls `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        const source = new Source(this);
        return new Each(source, source, fn);
    }
});
