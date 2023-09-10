

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

import noop from '../noop.js';
import Stream, { pipe, push, stop } from './stream.js';
import PromiseStream from './promise-stream.js';

const assign = Object.assign;
const create = Object.create;


/*
Pipe()
*/

function isActive(object) {
    return !!object.active;
}

function isStopped(object) {
    return !!object.stopped;
}

function Pipe(input, name, stream, values, pipes) {
    this.input = input.then ?
        // Turn promise into a stream
        new PromiseStream(input) :
        input ;

    this.stream  = stream;
    this.values  = values;
    this.pipes   = pipes;
    this.name    = name;
    this.active  = false;
    this.stopped = false;
}

assign(Pipe.prototype, {
    push: function(value) {
        const { stream, values, name } = this;
        values[name] = value;
        this.active  = true;
        if (stream.active || (stream.active = this.pipes.every(isActive))) {
            if (stream.mutable) {
                stream[0].push(values);
            }
            else {
                // Assign to new object in order to produce non-duplicates
                const object = new this.values.constructor();
                stream[0].push(assign(object, values));
            }
        }
    },

    // This is not part of the stop chain
    stop: function() {
        this.stopped = true;
        // Stop stream when all inputs are stopped
        if (this.pipes.every(isStopped)) {
            stop(this.stream);
        }
    }
});


/*
CombineStream()
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
        const pipes  = this.pipes = [];
        let pipeable;

        pipe(this, output);

        // Populate pipes
        let name;
        for (name in inputs) {
            const input = inputs[name];
            if (typeof input === 'object' && (input.pipe || input.then)) {
                pipes.push(new Pipe(input, name, this, inputs, pipes));
            }
        }

        // Listen to inputs
        for (pipeable of pipes) {
            pipeable.input
            // Will call pipeable.stop()
            .done(pipeable)
            // Will call pipeable.push()
            .pipe(pipeable);
        }

        return output;
    },

    stop: function() {
        // Check status
        if (this.status === 'done') { return this; }

        // Stop all inputs
        this.pipes.forEach((pipeable) => {
            const input = pipeable.input;

            // Does input have more than 1 output? Don't stop it, unpipe()
            // this from it.
            if (input[1]) {
                unpipe(input, pipeable);
            }
            else {
                // Don't pass arguments up the stop chain
                input.stop();
            }
        });

        return stop(this.stream);
    }
});
