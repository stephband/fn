
import nothing         from './nothing.js';
import self            from './self.js';

import Stream          from './stream/stream.js';
import BroadcastStream from './stream/broadcast-stream.js';
import BufferStream    from './stream/buffer-stream.js';
import BatchStream     from './stream/batch-stream.js';
import CombineStream   from './stream/combine-stream.js';
import MergeStream     from './stream/merge-stream.js';
import PromiseStream   from './stream/promise-stream.js';
//import ZipProducer     from './stream/zip-producer.js';

const A      = Array.prototype;
const assign = Object.assign;


function throwTypeError(source) {
    throw new TypeError('Stream: invalid source object cannot be read into stream');
}

export default assign(Stream, {
    /**
    Stream.of(value1, value2, ...)
    Creates a pushable BufferStream from the given parameters.
    **/
    of: function() {
        return new BufferStream(A.slice.apply(arguments));
    },

    /**
    Stream.from(source)
    Creates a stream from a `source`, which may be a producer (an object with a
    `.pipe()` method), an array (or array-like), or a promise.
    **/
    from: function(source) {
            // Source is a stream or producer
        return source.pipe ? new Stream(source) :
            // Source is a promise
            source.then ? new PromiseStream(source) :
            // Source is an array-like
            typeof source.length === 'number' ? new BufferStream(source) :
            // Source cannot be made into a stream
            throwTypeError(source) ;
    },

    /**
    Stream.batch(duration)
    Returns a stream of streams containing values that each arrived within
    `duration` of the previous value. A gap longer than `duration` stops the
    current burst stream and the next value is emitted in a new burst stream.

    `duration` may be:

    - a number, in seconds
    - the string `'frame'`, representing an animation frame
    - the string `'tick'`, representing a processing tick
    **/
    batch: (duration) => new BatchStream(nothing, duration),
    burst: (duration) => (console.warn('Stream.burst() is now Stream.batch()'), new BatchStream(nothing, duration)),

    /**
    Stream.broadcast(options)
    Returns a broadcast stream. Methods called on this stream each
    create a new stream.
    **/
    broadcast: (options) => new BroadcastStream(nothing, options),

    /**
    Stream.combine(streams)
    Creates a stream by combining the latest values of all input streams into
    an objects containing those values. A new object is emitted when a new value
    is pushed to any input stream.
    **/
    combine: (streams) => new CombineStream(streams),

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream. Values are emitted in the time order they are received
    from inputs.
    **/
    merge: function() {
        return new MergeStream(arguments);
    },

    /**
    Stream.zip(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    **/
    /*zip: function() {
        return new Stream(new ZipProducer(arguments));
    }*/
});

assign(Stream.prototype, {
    log: (window.DEBUG && window.console) ?
        function log(...parameters) {
            return this.map((value) => (console.log(...parameters, value), value))
        } :
        self ,

    /**
    .batch(duration)
    Returns a stream of streams containing values that each arrived within
    `duration` of the previous value. A gap longer than `duration` stops the
    current burst stream and the next value is emitted in a new burst stream.

    `duration` may be:

    - a number, in seconds
    - the string `'frame'`, representing an animation frame
    - the string `'tick'`, representing a processing tick
    **/
    batch: function(duration) {
        return new BatchStream(this, duration);
    },
    burst: function(duration) {
        console.warn('stream.burst() is now stream.batch()');
        return new BatchStream(this, duration);
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
        return new BroadcastStream(this, options);
    }
});


// Debug

if (window.DEBUG) {
    window.Stream = Stream;
}

