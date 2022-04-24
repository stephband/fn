
import Producer from './producer.js';

const A      = Array.prototype;
const assign = Object.assign;

/*
BufferProducer
*/

export default function BufferProducer(buffer) {
    this.buffer = buffer;
}

assign(BufferProducer.prototype, Producer.prototype, {
    // Opt in to having the Stream push to this producer
    pushable: true,

    push: function(value) {
        // Meh. A bit naff, this. Because buffer may be the output stream, which
        // has had its .push() method replaced to delegate to here
        this.buffer.constructor.prototype.push.call(this.buffer, value);
    },

    pipe: function(stream) {
        this[0] = stream;

        // Empty buffer
        while(this[0] && this.buffer.length) {
            stream[0].push(A.shift.apply(this.buffer));
        }

        if (this[0]) {
            this.buffer = this[0];
        }
    }
});
