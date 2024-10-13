
import self     from './self.js';
import Stream   from './stream/stream.js';
import Combine  from './stream/combine-stream.js';
import Clock    from './stream/clock-stream.js';
import Throttle from './stream/throttle-stream.js';

const A      = Array.prototype;
const assign = Object.assign;


function throwTypeError(source) {
    throw new TypeError('Stream cannot be created .from() ' + typeof source);
}

assign(Stream, {
    /**
    Stream.isStream(object)
    Checks `object`'s prototype and returns `true` or `false`.
    **/
    isStream: function(object) {
        return Stream.prototype.isPrototypeOf(object);
    },

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
    combine: (object, options) => new Combine(object, options),

    /**
    Stream.clock(duration)

    If `duration` is a number, constructs an interval stream of DOM timestamps
    at `duration` seconds apart.

    If `duration` is `"frame"`, constructs a stream of DOM timestamps from
    `requestAnimationFrame`.
    **/
    clock: (duration) => new Clock(duration),

    /**
    Stream.throttle(time)
    **/
    throttle: function(time) {
        return new Throttle(null, time);
    }
});

assign(Stream.prototype, {
    /**
    .throttle(time)
    **/
    throttle: function(time) {
        return new Throttle(this, time);
    },

    /**
    .log(...parameters)
    **/
    log: (window.DEBUG && window.console) ?
        function log(...parameters) {
            return this.map((value) => (console.log(...parameters, value), value))
        } :
        self
});

export { Stream as default }
