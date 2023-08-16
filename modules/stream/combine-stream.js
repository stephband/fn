
/**
CombineStream(object, options)
Creates a stream of objects containing the latest values of all streams and
promises in `object`, as soon as they become active or resolved.

```js
new CombineStream({ a: stream, b: promise }).each((object) => {
    // object.a and object.b are values
});
```

If `object` contains properties that are not streams or promises, those are
also set on streamed objects.

```js
new CombineStream({ a: stream, b: promise, c: 5 }).each((object) => {
    // object.c is 5
});
```

Output objects are created using the constructor of the input `object`,
making it possible to use an array or other object as input and expect an
array or other object as output.

```js
new CombineStream([promise, stream]).each((object) => {
    // object is an Array
});
```

The stream may be made mutable by passing in an options object with
`mutable` set to `true`. In this case no new objects are constructed,
instead the input `object` is mutated and pushed to the output stream.

```js
new CombineStream({ a: stream, b: promise }, { mutable: true }).each((object) => {
    // object is the input object
});
```
**/

import noop                   from '../noop.js';
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;
const keys   = Object.keys;


/*
Pipe
*/

function isActive(object) {
    return !!object.active;
}

function isStopped(object) {
    return !!object.stopped;
}

function Pipe(stream, values, pipes, name, input, mutable) {
    this.stream  = stream;
    this.values  = values;
    this.pipes   = pipes;
    this.name    = name;
    this.input   = input;
    this.mutable = mutable;
    this.active  = false;
    this.stopped = false;
}

assign(Pipe.prototype, {
    push: function(value) {
        const stream = this.stream;
        const values = this.values;
        const name   = this.name;

        values[name] = value;
        this.active  = true;

        if (stream.active || (stream.active = this.pipes.every(isActive))) {
            if (this.mutable) {
                push(stream[0], values);
            }
            else {
                // Assign to new object in order to produce non-duplicates
                const object = new this.values.constructor();
                push(stream[0], assign(object, values));
            }
        }
    },

    stop: function() {
        this.stopped = true;

        // Stop stream when all inputs are stopped
        if (this.pipes.every(isStopped)) {
            stop(this.stream);
        }
    },

    done: function(stopable) {
        this.stream.done(stopable);
    }
});


/*
CombineProducer
*/

export default function CombineStream(inputs, options) {
    this.inputs  = inputs;
    this.mutable = options && (options === true || options.mutable);
    this.active  = false;
}

CombineStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        const inputs = this.inputs;
        const pipes  = [];

        // As in Stream.prototype.pipe()
        this[0] = output;
        output.done(this);

        // Listen to input streams
        let name;
        for (name in inputs) {
            const input = inputs[name];

            if (input.pipe) {
                // Input is a stream
                const pipe = new Pipe(this, inputs, pipes, name, input, this.mutable);
                pipes.push(pipe);
                input.pipe(pipe);
            }
            else if (input.then) {
                // Input is a promise. Do not chain .then() and .finally(),
                // they must fire in the same tick
                const pipe = new Pipe(this, inputs, pipes, name, input, this.mutable);
                pipes.push(pipe);
                input.then((value) => pipe.push(value));
                input.finally(() => pipe.stop());
            }
        }

        return output;
    }
});
