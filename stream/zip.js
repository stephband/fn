
import Stream from './stream.js';

function hasLength(buffer) {
    return buffer.length > 0;
}

function toObject(object, buffer, i) {
    object[i] = buffer.shift();
    return object;
}

export function Zip(streams) {
    const buffers = streams.map(() => []);
    return new Stream((push) =>
        streams.forEach((stream, i) => {
            const buffer = buffer[i];
            stream.each((value) => {
                buffer.push(value);
                if (buffers.every(hasLength)) {
                    push(buffers.reduce(toObject, {}));
                }
            })
        })
    );
}

export default function zip() {
    return Zip(Array.from(arguments));
}
