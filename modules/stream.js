
import Stream, { Map, Filter, FlatMap, Reduce, Scan, Take, Each } from './stream/stream.js';
import Distributor from './stream/distributor.js';
import Combine     from './stream/combine.js';
import Merge       from './stream/merge.js';

const assign = Object.assign;

assign(Stream, {
    /**
    Stream.combine(streams)
    Creates a stream by combining the latest values of all input streams into
    an objects containing those values. A new object is emitted when a new value
    is pushed to any input stream.
    **/
    distribute: function distribute(memorise) {
        return Stream.of().distribute(memorise);
    },

    /**
    Stream.combine(streams)
    Creates a stream by combining the latest values of all input streams into
    an objects containing those values. A new object is emitted when a new value
    is pushed to any input stream.
    **/
    combine: function combine(streams) {
        return Combine(streams);
    },

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    **/
    merge: function() {
        return Merge(arguments);
    },
});

assign(Stream.prototype, {
    /**
    .map(fn)
    Maps each value in the stream to `fn(value)`. Resulting values that are not
    `undefined` are pushed downstream.
    **/
    map: function(fn) {
        return new Map(this.source, this, fn);
    },

    /**
    .filter(fn)
    Filters out values from the stream where `fn(value)` is falsy.
    **/
    filter: function(fn) {
        return new Filter(this.source, this, fn);
    },

    /**
    .flatMap(fn)
    **/
    flatMap: function(fn) {
        return new FlatMap(this.source, this, fn);
    },

    /**
    .reduce(fn, initial)
    Consumes the stream. TODO: Not sure what to return old boy.
    **/
    reduce: function(fn, initial) {
        return new Reduce(this.source, this, fn, initial);
    },

    /**
    .scan(fn, initial)
    Calls `fn(current, value)` for each `value` in the stream. Where `fn`
    returns a value it is pushed downstream, and `current` assumes that value
    on the next iteration. Where `fn` returns `undefined` nothing is pushed and
    `current` remains unchanged.
    **/
    scan: function(fn, accumulator) {
        return new Scan(this.source, this, fn, accumulator);
    },

    /**
    .take(n)
    Returns a stream of the first `n` values of the stream.
    **/
    take: function(n) {
        return new Take(this.source, this, n);
    },

    /**
    .each(fn)
    Starts the stream and calls `fn(value)` for each value in it.
    Returns the stream.
    **/
    each: function(fn) {
        return new Each(this.source, this, fn);
    },

    /**
    .distribute(memorise)
    **/
    distribute: function(options) {
        return new Distributor(this, options && options.memory);
    }
});

export default Stream;


// Debug

if (window.DEBUG) {
    window.Stream = Stream;
}

