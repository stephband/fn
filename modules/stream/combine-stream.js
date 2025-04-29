

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


/*
Combine()
*/

export default function Combine(object, options) {
    this.object  = object;
    this.mutable = options && (options === true || options.mutable);
    this.active  = false;
}

Combine.prototype = assign(create(Stream.prototype), {
    start: function() {
        const object = this.object;
        const values = this.mutable ? object : {} ;
        const inputs = {};

        for (let name in object) {
            let input = object[name];

            // Ignore non-streamable inputs
            if (!input || typeof input !== 'object') continue;

            if (!input.pipe) {
                // Convert promise to stream
                if (input.then) input = Stream.from(input);
                // Ignore non-streamable objects
                else continue;
            }

            inputs[name] = input;
        }

        for (let name in inputs) {
            let input = inputs[name];

            input.each((value) => {
                values[name] = value;
                input.active = true;

                // If there is an input not yet active abort
                if (!this.active && Object.values(inputs).find((input) => !input.active)) return;
                this.active = true;

                Stream.push(this, this.mutable ?
                    // Treat inputs as mutable, return it directly
                    object :
                    // Create new object of the same kind as the original
                    assign(new object.constructor(), object, values)
                );
            });
        }

        return this;
    }
});
