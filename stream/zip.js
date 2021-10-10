
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

export function Zip(streams) {
    const buffers = A.map.call(streams, makeArray);
    return new Stream((controller) =>
        A.forEach.call(streams, (stream, i) => {
            const buffer = buffers[i];
            stream.each
            // Support streams
            && stream.each((value) => {
                buffer.push(value);
                if (buffers.every(hasLength)) {
                    controller.push(buffers.reduce(toObject, {}));
                }
            })
            // Support array-likes
            || A.forEach.call(stream, (value) => {
                buffer.push(value);
                if (buffers.every(hasLength)) {
                    controller.push(buffers.reduce(toObject, {}));
                }
            })
        })
    );
}

export default function zip() {
    return Zip(arguments);
}
