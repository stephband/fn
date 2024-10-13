

/**
Combine(object, options)
Creates a stream of objects containing the latest values of all streams and
promises in `object`, as soon as they become active or resolved.

```js
new Combine({ a: stream, b: promise }).each((object) => {
    // object.a and object.b are values
});
```

If `object` contains properties that are not streams or promises, those are
also set on streamed objects.

```js
new Combine({ a: stream, b: promise, c: 5 }).each((object) => {
    // object.c is 5
});
```

Output objects are created using the constructor of the input `object`,
making it possible to use an array or other object as input and expect an
array or other object as output.

```js
new Combine([promise, stream]).each((object) => {
    // object is an Array
});
```

The stream may be made mutable by passing in an options object with
`mutable` set to `true`. In this case no new objects are constructed,
instead the input `object` is mutated and pushed to the output stream.

```js
new Combine({ a: stream, b: promise }, { mutable: true }).each((object) => {
    // object is the input object
});
```
**/

import Stream from './stream.js';

const assign = Object.assign;
const create = Object.create;

function Pipe(name, input, object) {
    this.name   = name;
    this.input  = input;
    this.object = object;
}

Pipe.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        const { object, input, name } = this;
        object[name] = value;
        input.active = true;

        return isActive(this) ?
            this.mutable ?
                // Treat inputs as mutable, return it directly
                object :
                // Create new object of the same kind as the original
                assign(new object.constructor(), object) :
            // Not active yet, undefined is ignored by stream
            undefined ;
    }
});


/*
Combine()
*/

function isActive(stream) {
    if (stream.active) return true;
    let i = 0, input;
    while (input = this[--i]) if (!input.active) return false;
    return stream.active = true;
}

export default function Combine(inputs, options) {
    this.inputs  = inputs;
    this.mutable = options && (options === true || options.mutable);
    this.active  = false;
}

Combine.prototype = assign(create(Stream.prototype), {
    start: function() {
        const inputs = this.inputs;

        let name;
        for (name in inputs) {
            const input = inputs[name];

            // Ignore non-streamable inputs
            if (!input || typeof input !== 'object') continue;

            if (!input.pipe) {
                // Convert promise to stream
                if (input.then) input = Stream.from(input);
                // Ignore non-streamable objects
                else continue;
            }

            input
            .pipe(new Pipe(name, input, inputs))
            .pipe(this);
        }

        return this;
    }
});
