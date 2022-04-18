
import Stream from './stream.js';

/*
Merge()
*/

export default function Merge(streams) {
    return new Stream((controller) => {
        let i = -1, stream;
        while (stream = streams[++i]) {
            if (stream.each) {
                // Merge streams
                stream.each((value) => controller.push(value));
                // And stop them when this one stops?
                controller.done(stream);
            }
            else if (stream.then) {
                stream.then((value) => controller.push(value));
                // What should we do with errors?
            }
            else {
                // Merge arrays or array-likes
                controller.push.apply(controller, stream);
            }
        }
    });
}
