
import Stream from './stream.js';

/*
Merge()
*/

export default function Merge(streams) {
    return new Stream((controller) => {
        let i = -1, stream;
        while (stream = streams[++i]) {
            if (stream.each) {
                // Stop stream when controller stops - we wrap stream.each like
                // this because stream may be a broadcaster and we don't want to
                // stop that
                controller.done(
                    // Merge streams
                    stream.each((value) => controller.push(value))
                );
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
