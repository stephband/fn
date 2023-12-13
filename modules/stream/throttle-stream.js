
import Stream      from './stream.js';
import ClockStream from './clock-stream.js';

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

        const clock = new ClockStream(this.duration);

        this.value  = value;
        this.clock = clock
        .each((time) => {
            // If no value has been pushed since the last one stop the clock
            if (this.value === undefined) {
                clock.stop();
                this.clock = undefined;
                return;
            }

            // Push the latest value to output
            this[0].push(this.value);
            this.value = undefined;
        })
        .start();
    },

    stop: function(sendLastValue) {
        // Stop the frames stream
        this.clock.stop();

        if (sendLastValue) {
            this[0].push(value);
            this.value = undefined;
        }

        Stream.prototype.stop.apply(this, arguments);
        return this;
    }
});
