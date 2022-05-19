

//import Producer from './producer.js';
import Stream   from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
SSStream(values)
*/

function fire(stream, value) {
    stream.timer = undefined;
    stream[0].push(value);
}

function wait(stream, value) {
    const { duration, timer } = stream;

    if (timer) {
        clearTimeout(timer);
    }

    stream.timer = setTimeout(fire, duration * 1000, stream, value);
}

export default function WaitStream(duration) {
    this.duration = duration;
    this.timer    = undefined;
}

WaitStream.prototype = assign(create(Stream.prototype)/*, Producer.prototype*/, {
    push: function(value) {
        if (value !== undefined) {
            wait(this, value);
        }
    },

    stop: function() {
        clearTimeout(this.timer);
        return Stream.prototype.stop.apply(this, arguments);
    }
});
