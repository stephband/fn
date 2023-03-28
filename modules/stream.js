
import nothing         from './nothing.js';
import self            from './self.js';

import Stream, { isStream, pipe, push, stop } from './stream/stream.js';
import BroadcastStream from './stream/broadcast-stream.js';
import BufferStream    from './stream/buffer-stream.js';
import BatchStream     from './stream/batch-stream.js';
import ClockStream     from './stream/clock-stream.js';
import CombineStream   from './stream/combine-stream.js';
import FunctionStream  from './stream/function-stream.js';
import MergeStream     from './stream/merge-stream.js';
import PromiseStream   from './stream/promise-stream.js';
//import ZipProducer     from './stream/zip-producer.js';

const A      = Array.prototype;
const assign = Object.assign;


function throwTypeError(source) {
    throw new TypeError('Stream cannot be created from ' + typeof object);
}

assign(Stream, {
    isStream: isStream,

    /**
    Stream.of(value1, value2, ...)
    Creates a pushable BufferStream from the given parameters.
    **/
    of: function() {
        return new BufferStream(A.slice.apply(arguments));
    },

    /**
    Stream.from(source)
    Creates a stream from a `source`, which may be a producer (an object with
    `.pipe()` and `.stop()` methods), an array (or array-like), or a promise.
    **/
    from: function(source) {
            // Source is a stream or producer
        return source.pipe ? new Stream(source) :
            // Source is a promise
            source.then ? new PromiseStream(source) :
            // Source has length
            typeof source.length === 'number' ?
                // Source is a function
                typeof source === 'function' ? new FunctionStream(source) :
                // Source is an array-like
                new BufferStream(source) :
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

    /**
    Stream.broadcast(options)
    Returns a broadcast stream. Methods called on this stream each
    create a new stream.
    **/

    broadcast: (options) => new BroadcastStream(nothing, options),

    /**
    Stream.clock(duration)
    If `duration` is a number, returns a stream of DOM timestamps at `duration`
    seconds apart.

    If `duration` is `"frame"`, returns a stream of DOM timestamps at the
    animation frame rate.
    **/

    clock: (duration) => new ClockStream(duration),

    /**
    Stream.combine(object, options)
    Creates a stream of objects containing the latest values of all streams and
    promises in `object`, as soon as they become active or resolved.

    ```js
    Stream.combine({ a: stream, b: promise }).each((object) => {
        // object.a and object.b are values
    });
    ```

    If `object` contains properties that are not streams or promises, those are
    also set on streamed objects.

    ```js
    Stream.combine({ a: stream, b: promise, c: 5 }).each((object) => {
        // object.c is 5
    });
    ```

    Output objects are created using the constructor of the input `object`,
    making it possible to use an array or other object as input and expect an
    array or other object as output.

    ```js
    Stream.combine([promise, stream]).each((object) => {
        // object is an Array
    });
    ```

    The stream may be made mutable by passing in an options object with
    `mutable` set to `true`. In this case no new objects are constructed,
    instead the input `object` is mutated and pushed to the output stream.
    Generally speaking this is a Good Idea when trying to avoid garbage
    collection.

    ```js
    Stream.combine({ a: stream, b: promise }, { mutable: true }).each((object) => {
        // object is the input object, properties a and b are now values
    });
    ```
    **/

    combine: (streams, options) => new CombineStream(streams, options),

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

    merge: function() { return new MergeStream(arguments); },

    /*
    Stream.zip(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    */
    /*zip: function() {
        return new Stream(new ZipProducer(arguments));
    }*/

    /**
    Stream.writeable(fn)
    Creates a stream and passes it immediately to `fn`. the function is expected
    to set up the stream as a consumer. The head of the stream is returned.
    **/

    writeable: function(fn) {
        const stream = new Stream(nothing);
        fn(stream);
        return stream;
    }
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

export { Stream as default, pipe, push, stop };
