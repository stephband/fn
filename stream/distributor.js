
import { remove } from '../modules/remove.js';
import Stream from './stream.js';

/**
Distributor()
Creates a distributor. A distributor shares the usual methods of a Stream –
`.map()`, `.filter()` and so on – but creates a new stream for each method call.
**/

const assign = Object.assign;

export default function Distributor() {
    this.streams = [];
}

const prototype = assign(Distributor.prototype, {
    push: function() {
        let n = -1, stream;
        while (stream = this.streams[++n]) {
            stream.push.apply(stream, arguments)
        }
        return this;
    }
});

['map', 'filter', 'reduce', 'scan', 'take', 'each', 'pipe'].forEach((name) => {
    prototype[name] = function() {
        const stream = new Stream((source) => {
            // Add to streams
            this.streams.push(source);
            // Remove when done
            source.done(() => remove(this.streams, source));
        });

        return stream[name].apply(stream, arguments);
    };
});
