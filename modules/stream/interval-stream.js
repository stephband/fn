
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;

/*
IntervalStream(duration)
*/

export default function IntervalStream(duration) {
    this.duration = duration;
}

IntervalStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        this[0] = output;

        // Start producing values
        let n = 0;
        this.timer = setInterval(() => push(this[0], ++n), this.duration * 1000);
        push(this[0], n);
    },

    stop: function() {
        console.log('SSSTOOOPPP');
        clearInterval(this.timer);
        stop(this[0]);
        return this;
    }
});
