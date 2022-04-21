
import nothing from '../nothing.js';
import Stream  from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
Broadcast(producer, options)
A Broadcast stream may be piped to multiple outputs. The options object has
the optional properties:

```js
{
    // Remember and send the latest value to new pipes
    memory: true,

    // Start the stream immediately and keep it alive after all pipes are stopped
    live:   true
}
```
*/

export default function Broadcast(producer, options) {
    Stream.apply(this, arguments);

    // Mark this stream as a memory stream
    this.memory = !!(options && options.memory);

    // Open the stream immediately and keep it live even without outputs by
    // sending output 0 to nothing. It can now only be stopped by explicitly
    // calling .stop() on it, and not by stopping child streams.
    if (options && options.live) {
        this.pipe(nothing);
    }
}

Broadcast.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        if (value !== undefined) {
            // If this is a memory stream keep value
            if (this.memory) {
                this.value = value;
            }

            let n = -1;
            while (this[++n]) {
                this[n].push(value);
            }
        }
    },

    pipe: function(output) {
        let n = -1;
        while (this[++n]);
        this[n] = output;

        // If this is a memory stream, ie has value already
        if (this.value !== undefined) {
            output.push(this.value);
        }

        if (n === 0) {
            this.input.pipe(this);
        }

        return output;
    }
});
