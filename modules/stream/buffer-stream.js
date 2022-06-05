
import Stopable         from './stopable.js';
import Stream, { stop } from './stream.js';

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

    this.output = this.buffer;
}

BufferStream.prototype = assign(create(Stream.prototype), Stopable.prototype, {
    push: function(value) {
        if (value !== undefined) {
            this.output.push(value);
        }
    },

    pipe: function(output) {
        // Connect stream to output
        output.done(this);
        this[0] = output;

        // Empty buffer
        while(this.buffer.length) {
            output.push(A.shift.apply(this.buffer));
        }

        // Swap buffer for output, subsequent values are pushed straight into
        // the stream
        this.output = output;
        return output;
    },

    stop: function() {
        this.output = this.buffer;
        return Stream.prototype.stop.apply(this, arguments);
    }
});
