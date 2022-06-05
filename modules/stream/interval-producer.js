
import Stream from './stream.js';

const assign = Object.assign;
const create = Object.create;

/*
IntervalStream(duration)
*/

export function IntervalStream(duration) {
    this.duration = duration;
}

IntervalStream.prototype = assign(create(IntervalStream.prototype), {
    push: null,

    pipe: function(stream) {
        this.stream = stream;

        // Start producing values
        let n = 0;
        this.timer = setInterval(() => stream.push(++n), this.duration * 1000);
        stream.push(n);
    },

    stop: function() {
        clearInterval(this.timer);
        return Stream.prototype.stop.apply(this);
    }
});
