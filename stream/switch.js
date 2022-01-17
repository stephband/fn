
import { remove } from '../modules/remove.js';
import Stream from './stream.js';

/**
Switch()
Creates a Switch.
**/

const assign = Object.assign;

export default function Switch() {
    this.streams = [];
    this.index   = 0;
}

const prototype = assign(Switch.prototype, {
    push: function() {
        const stream = this.streams[this.index];
        stream && stream.push.apply(stream, arguments);
        return this;
    }
});

['map', 'filter', 'each', 'pipe'].forEach((name) => {
    prototype[name] = function() {
        const stream = new Stream((source) => {
            // Add to streams
            this.streams.push(source);
            // Remove when done
            //source.done(() => remove(this.streams, source));
        });

        return stream[name].apply(stream, arguments);
    };
});
