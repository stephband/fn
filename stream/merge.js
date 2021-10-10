
/** 
merge(source1, source2, ...)
Merges multiple sources into a hot stream.
**/

import Stream from './stream.js';

export function Merge(streams) {
    return new Stream((controller) => {
        let i = -1, stream;
        while (stream = streams[++i]) {
            stream.each
            // Merge streams
            && stream.each((value) => controller.push(value))
            // Merge arrays or array-likes
            || controller.push.apply(controller, stream) ;
        }
    });
}

export default function merge() {
    return Merge(arguments);
}
