
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
    pipe: function(stream) {
        this[0] = stream;
        while(this.buffer.length) {
            stream.push(A.shift.apply(this.buffer));
        }
    }
});
