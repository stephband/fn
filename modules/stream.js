
import nothing         from './nothing.js';

import Stream          from './stream/stream.js';
import Broadcast       from './stream/broadcast.js';
import BufferProducer  from './stream/buffer-producer.js';
import CombineProducer from './stream/combine-producer.js';
import MergeProducer   from './stream/merge-producer.js';
import ZipProducer     from './stream/zip-producer.js';

const assign = Object.assign;

export default assign(Stream, {
    /**
    Stream.broadcast(options)
    Returns a pushable broadcast stream. Methods called on this stream each
    create a new stream.
    **/
    broadcast: function broadcast(options) {
        return new Broadcast(new BufferProducer(nothing), options);
    },

    /**
    Stream.combine(streams)
    Creates a stream by combining the latest values of all input streams into
    an objects containing those values. A new object is emitted when a new value
    is pushed to any input stream.
    **/
    combine: function combine(streams) {
        return new Stream(new CombineProducer(streams));
    },

    /**
    Stream.merge(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    **/
    merge: function() {
        return new Stream(new MergeProducer(arguments));
    },

    /**
    Stream.zip(stream1, stream2, ...)
    Creates a stream by merging values from any number of input streams into a
    single output stream.
    **/
    zip: function() {
        return new Stream(new ZipProducer(arguments));
    }
});

assign(Stream.prototype, {
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
    }
});


// Debug

if (window.DEBUG) {
    window.Stream = Stream;
}

