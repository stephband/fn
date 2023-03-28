
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;

/*
ClockStream(duration)
*/

export default function ClockStream(duration) {
    this.duration = duration;
}

ClockStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        this[0] = output;

        const update = this.duration === 'frame' ?
            // Animation frame clock
            (time) => {
                this.frame = requestAnimationFrame(update);
                push(this[0], time / 1000);
            } :
            // Timer clock
            (time) => {
                this.frame = setInterval(() => push(this[0], performance.now() / 1000), this.duration * 1000);
                push(this[0], time / 1000);
            } ;

        // Start producing values
        update(performance.now());
        return output;
    },

    stop: function() {
        if (this.duration === 'frame') {
            cancelAnimationFrame(this.frame);
        }
        else {
            clearInterval(this.frame);
        }

        this.frame = undefined;
        stop(this[0]);
        return this;
    }
});

