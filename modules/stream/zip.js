
import Stream from './stream.js';

const A = Array.prototype;

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

export default function Zip(streams) {
    const buffers = A.map.call(streams, makeArray);

    return new Stream((controller) => {
        A.forEach.call(streams, (stream, i) => {
            const buffer = buffers[i];

            // Support streams
            if (stream.each) {
                // Stop stream when controller stops - we wrap stream.each like
                // this because stream may be a broadcaster and we don't want to
                // stop that.
                controller.done(
                    stream.each((value) => fillBuffer(controller, buffers, buffer, value))
                );
            }
            // Support promises
            else if (stream.then) {
                stream.then((value) => fillBuffer(controller, buffers, buffer, value));
            }
            // Support array-likes
            else {
                A.forEach.call(stream, (value) => fillBuffer(controller, buffers, buffer, value));
            }
        });
    });
}
