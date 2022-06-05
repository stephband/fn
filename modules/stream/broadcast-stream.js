
import nothing from '../nothing.js';
import Stream  from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
BroadcastStream(producer, options)
A BroadcastStream may be piped to multiple outputs. The options object has
the optional properties:

```js
{
    // Remember and send the latest value to new pipes
    memory: true,

    // Start the stream immediately and keep it alive after all pipes are stopped
    hot:    true
}
```
*/

function disconnect(stream, output) {
    if (stream[1]) {
        let n = -1;
        while (stream[++n] && stream[n] !== output);
        while (stream[n++]) { stream[n - 1] = stream[n]; }
    }
    else {
        stream.stop();
    }
}

export default function BroadcastStream(producer, options) {
    Stream.apply(this, arguments);

    // Mark this stream as a memory stream
    this.memory = !!(options && options.memory);

    // Open the stream immediately and keep it live even without outputs by
    // sending output 0 to nothing. It can now only be stopped by explicitly
    // calling .stop() on it, and not by stopping child streams.
    if (options && options.hot) {
        this.pipe(nothing);
    }
}

BroadcastStream.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        if (value === undefined) { return; }

        // If this is a memory stream keep value
        if (this.memory) {
            this.value = value;
        }

        let n = -1;
        while (this[++n]) {
            this[n].push(value);
        }
    },

    pipe: function(output) {
        let n = -1;
        while (this[++n]);

        // If this is a memory stream and this is the first output, flush the
        // pipe. But we don't have any outputs yet! I know, but the latest value
        // is remembered and it gets pushed to output below.
        if (this.memory && n === 0) {
            this.input.pipe(this);
        }

        this[n] = output;
        output.done(() => disconnect(this, output));

        // If this is a memory stream and has value already
        if (this.value !== undefined) {
            output.push(this.value);
        }

        // If not a memory stream and this is the first output start the pipeline
        if (!this.memory && n === 0) {
            this.input.pipe(this);
        }

        return output;
    }
});
