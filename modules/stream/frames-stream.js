
import Stream, { pipe, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;

/*
Frames(duration)

If `duration` is a number, constructs a stream of DOM timestamps at `duration`
seconds apart.

If `duration` is `"frame"`, constructs a stream of DOM timestamps at the
animation frame rate.
*/


export default function Frames(duration) {
    this.duration = duration;
    this.timer    = undefined;
    this.status   = 'idle';
}

Frames.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        pipe(this, output);
        return output;
    },

    start: function() {
        if (this.status === 'playing') { return this; }
        this.status = 'playing';

        if (this.duration === 'frame') {
            const fn = (time) => {
                this.timer = requestAnimationFrame(fn);
                this[0].push(time / 1000);
            };

            // Start producing values
            requestAnimationFrame(fn)
        }
        else {
            this.timer = setInterval(
                () => this[0].push(performance.now() / 1000),
                this.duration * 1000
            );
        }

        return this;
    },

    stop: function(sendStopFrame) {
        if (this.status !== 'playing') { return this; }

        // Immediate stop
        this.duration === 'frame' ?
            cancelAnimationFrame(this.timer) :
            clearInterval(this.timer) ;

        this.timer  = undefined;
        this.status = 'idle';
        return this;
    }
});

