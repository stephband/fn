
import Stream from './stream.js';

export function Merge(streams) {
    return new Stream((push) => {
        let i = -1, stream;
        while (stream = streams[++i]) {
            stream.each(push)
        }
    });
}

export default function merge() {
    return Merge(arguments);
}
