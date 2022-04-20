
import Producer from './producer.js';

const assign = Object.assign;

/*
Producer
[note: producer must not have property '1', as that is used to detect multicast
branch when stopping the chain inside unpipe()].
*/

export function IntervalProducer() {

}

assign(IntervalProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        this.stream = stream;

        // Start producing values
        let n = 0;
        this.timer = setInterval(() => stream.push(++n), 3000);
        stream.push(n);
    },

    stop: function() {
        clearInterval(this.timer);
        Producer.prototype.stop.apply(this);
    }
});
