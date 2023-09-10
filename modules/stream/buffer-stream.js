
import nothing from '../nothing.js';
import Stream, { pipe, stop } from './stream.js';

const A      = Array.prototype;
const assign = Object.assign;
const create = Object.create;


/*
BufferStream(values)
A BufferStream may be pushed to before it is piped, as it starts life
with an array buffer of values.
*/

function notUndefined(value) {
    return value !== undefined;
}

export default function BufferStream(values) {
    this.buffer = values ? values : [] ;
}

BufferStream.prototype = assign(create(Stream.prototype), {
    pipe: function(output) {
        // Connect stream to output
        pipe(this, output);

        // Empty buffer into stream. Stream may be stopped during this loop so
        // check for `this[0]`.
        while(this.buffer.length && this[0]) {
            let value = A.shift.apply(this.buffer);
            if (value !== undefined) {
                this[0].push(value);
            }
        }

        // Swap buffer for output, values are now pushed straight into output
        this.buffer = output;
        return output;
    },

    push: function(value) {
        // .push() will buffer values even before .pipe() has set up the stream
        if (value === undefined) { return; }
        return this.buffer.push(value);
    },

    stop: function() {
        if (this.input) {
            return Stream.prototype.stop.apply(this, arguments);
        }

        this.buffer = nothing;
        return stop(this);
    }
});
