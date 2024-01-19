
import Stream     from './stream.js';
import TimeStream from './clock-stream.js';

const assign  = Object.assign;
const create  = Object.create;


/** Throttle(stream, frames) **/

export default function Throttle(input, duration) {
    Stream.call(this, input);
    this.duration = duration;
}

Throttle.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        // If no value
        if (value === undefined) {
            return;
        }

        // If clock is running
        if (this.clock) {
            // Store latest value
            this.value = value;
            return;
        }

        const clock = new TimeStream(this.duration);
        const fn = (time) => {
            // If no value has been pushed since the last one stop the clock
            if (this.value === undefined) {
                clock.stop();
                this.clock = undefined;
                return;
            }

            // Push the latest value to output
            this[0].push(this.value);
            this.value = undefined;
        };


        this.value = value;
        this.clock = clock.each(fn).start();
    },

    stop: function(sendLastValue) {
        // Stop the frames stream
        if (this.clock) {
            this.clock.stop();
            this.clock = undefined;
        }

        if (sendLastValue) {
            this[0].push(value);
            this.value = undefined;
        }

        Stream.prototype.stop.apply(this, arguments);
        return this;
    }
});
