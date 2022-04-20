
import Producer from './producer.js';

const A      = Array.prototype;
const assign = Object.assign;

/*
ZipProducer
*/

function hasLength(buffer) {
    return buffer.length > 0;
}

function toObject(object, buffer, i) {
    object[i] = buffer.shift();
    return object;
}

function makeArray(object) {
    return [];
}

function fillBuffer(controller, buffers, buffer, value) {
    buffer.push(value);
    if (buffers.every(hasLength)) {
        controller.push(buffers.reduce(toObject, {}));
    }
}


export default function ZipProducer(inputs) {
    this.inputs  = inputs;
    this.buffers = A.map.call(inputs, makeArray);
}

assign(ZipProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        const inputs  = this.inputs;
        const buffers = this.buffers;

        this[0] = stream;

        A.forEach.call(inputs, (input, i) => {
            const buffer = buffers[i];

            // Support streams
            if (input.each) {
                // Stop stream when controller stops - we wrap stream.each like
                // this because stream may be a broadcaster and we don't want to
                // stop that.
                stream.done(
                    input.each((value) => fillBuffer(stream, buffers, buffer, value))
                );
            }
            // Support promises
            else if (input.then) {
                input.then((value) => fillBuffer(stream, buffers, buffer, value));
            }
            // Support array-likes
            else {
                A.forEach.call(input, (value) => fillBuffer(stream, buffers, buffer, value));
            }
        });
    }
});
