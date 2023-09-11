
import nothing         from './nothing.js';
import self            from './self.js';

import Stream, { Broadcast, pipe, push, stop } from './stream/stream.js';
import BufferStream    from './stream/buffer-stream.js';
import CombineStream   from './stream/combine-stream.js';
import FunctionStream  from './stream/function-stream.js';
//import MergeStream     from './stream/merge-stream.js';
import PromiseStream   from './stream/promise-stream.js';

const A      = Array.prototype;
const assign = Object.assign;


function throwTypeError(source) {
    throw new TypeError('Stream cannot be created .from() ' + typeof source);
}

assign(Stream, {
    /**
    Stream.of(value1, value2, ...)
    Creates a pushable BufferStream from the given parameters.
    **/

    of: function() {
        return new BufferStream(A.slice.apply(arguments));
    },

    /**
    Stream.from(source)
    Creates a stream from `source`, which may be an **array** (or array-like),
    a **promise**, a **function**, a **producer** (an object with `.pipe()` and
    `.stop()` methods), or an **object** of streams, promises or values.
    **/

    from: function(source) {
        return !source ? throwTypeError(source) :
            // Source is an object
            typeof source === 'object' ?
                // Source is a stream or producer
                typeof source.pipe === 'function' ? new Stream(source) :
                // Source is a promise
                typeof source.then === 'function' ? new PromiseStream(source) :
                // Source is an array or array-like
                typeof source.length === 'number' ? new BufferStream(source) :
                // Source is an object of streams, promises and values
                new CombineStream(source) :
            // Source is a function
            typeof source === 'function' ? new FunctionStream(source) :
            // Source cannot be made into a stream
            throwTypeError(source) ;
    },

    /*
    Stream.broadcast(options)
    Returns a broadcast stream. Methods called on this stream each
    create a new stream.
    */

    broadcast: (options) => new Broadcast(nothing, options),

    /**
    Stream.combine(inputs)
    Creates a stream of objects containing the latest values of all streams and
    promises in `inputs` as they resolve:

    ```js
    Stream.combine({ a: stream, b: promise }).each((object) => {
        // object.a and object.b are values
    });
    ```

    If `inputs` contains properties that are not streams or promises, those are
    also set on streamed objects:

    ```js
    Stream.combine({ a: stream, c: 5 }).each((object) => {
        // object.c is 5
    });
    ```

    By default immutable – the stream emits new objects – it can be made to
    emit a mutated `inputs` object instead, by passing an options object with
    `mutable` set to `true` as a second parameter. This can help minimise
    garbage collection when dealing with large streams, but emitted objects
    are only valid to be consumed synchronously, as the next emitted object is
    actually the same object.

    ```js
    Stream
    .combine({ a: stream, b: promise }, { mutable: true })
    .each((object) => {
        // object is the input object, properties a and b are now values
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
    **/

    combine: (object, options) => new CombineStream(object, options),

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

    //merge: function() { return new MergeStream(arguments); }
});

assign(Stream.prototype, {
    log: (window.DEBUG && window.console) ?
        function log(...parameters) {
            return this.map((value) => (console.log(...parameters, value), value))
        } :
        self
});

export { Stream as default, pipe, push, stop };
