
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
    push: function(value) {
        const stream = this[0];

        if (stream) {
            stream[0].push(value);
        }
        else {
            this.buffer.push(value);
        }
    },

    pipe: function(stream) {
        this[0] = stream;

        // Empty buffer
        while(this.buffer.length) {
            stream[0].push(A.shift.apply(this.buffer));
        }
    }
});
