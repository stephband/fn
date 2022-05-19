
import Producer from './producer.js';
import Stream   from './stream.js';

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

export default function BufferStream(values) {
    this.buffer = values || [];
}

BufferStream.prototype = assign(create(Stream.prototype), Producer.prototype, {
    push: function(value) {
        if (value !== undefined) {
            this.buffer.push(value);
        }
    },

    pipe: function(output) {
        this[0] = output;

        // Empty buffer. Todo: check for undefined
        while(this.buffer.length) {
            this[0].push(A.shift.apply(this.buffer));
        }

        // Swap buffer for output so subsequent values are pushed straight into
        // the stream
        this.buffer = this[0];
        return output;
    }
});
