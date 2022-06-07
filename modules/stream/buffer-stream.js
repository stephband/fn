
import Stream, { stop, push } from './stream.js';

const A      = Array.prototype;
const assign = Object.assign;
const create = Object.create;


/*
BufferStream(values)
A BufferStream may be `.push()`ed to before it is `.pipe()`d, as it starts life
with an array buffer of values.

BufferStream is effectively a Producer - it has no input to pipe from - so
inherit .stop() from Producer.prototype. Although, I do wonder if .stop()
shouldn't empty the buffer.
*/

function notUndefined(value) {
    return value !== undefined;
}

export default function BufferStream(values) {
    this.buffer = values ?
        values.filter ? values.filter(notUndefined) :
        values :
        [] ;
}

BufferStream.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        if (value !== undefined) {
            push(this.buffer, value);
        }
    },

    pipe: function(output) {
        // Connect stream to output
        output.done(this);
        this[0] = output;

        // Empty buffer into stream
        while(this.buffer.length) {
            // Stream may be stopped during this loop so push to `this[0]`
            // rather than to `output`
            push(this[0], A.shift.apply(this.buffer));
        }

        // Swap buffer for output, values are now pushed straight into output
        this.buffer = output;
        return output;
    },

    stop: function() {
        this.buffer = undefined;
        stop(this);
        return this;
    }
});
