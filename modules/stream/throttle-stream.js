
import Stream from './stream.js';
import Frames from './frames-stream.js';

const assign  = Object.assign;
const create  = Object.create;


/** Throttle(stream, frames) **/

export default function Throttle(input, frames) {
    frames = Stream.isStream(frames) ?
        frames :
        new Frames(this, frames) ;

    this.input = input;
    this.frames = frames.each((time) => {
        if (this.value === undefined) {
            frames.stop();
            return;
        }

        this[0].push(this.value);
        this.value = undefined;
    });
}

Throttle.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        if (value === undefined) { return; }

        if (this.frames.status !== 'playing') {
            // Start the frames stream and send initial value
            this.frames.start();
            this[0].push(value);
        }
        else {
            // Store latest value
            this.value = value;
        }
    },

    stop: function() {
        // Stop the frames stream
        this.frames.stop();
        Stream.prototype.stop.apply(this, arguments);
        return this;
    }
});
