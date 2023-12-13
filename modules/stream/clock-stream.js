
import Stream, { pipe, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;

/*
ClockStream(duration)

If `duration` is a number, constructs a stream of DOM timestamps at `duration`
seconds apart.

If `duration` is `"frame"`, constructs a stream of DOM timestamps at the
animation frame rate.

A ClockStream requires an explicit call to `.start()` to make it play. The
`.start()` method optionally accepts a `startTime` parameter.
*/


export default function ClockStream(duration) {
    this.duration = duration;
    this.timer    = undefined;
    this.status   = 'idle';
}

ClockStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        return pipe(this, output);
    },

    start: function(startTime) {
        if (this.status !== 'idle') {
            return this;
        }

        this.status = 'waiting';

        if (this.duration === 'frame') {
            const fn = (time) => {
                this.timer = requestAnimationFrame(fn);
                this[0].push(time / 1000);
            };

            // Start producing values
            this.timer = requestAnimationFrame(fn);
            // OR, for immediate start
            //fn(performance.now());
        }
        else {
            const time = performance.now() / 1000;

            // Wait until startTime, or where startTime is undefined, next tick
            this.timer = setTimeout(() => {
                const time = performance.now() / 1000;
                const fn   = () => this[0].push(performance.now() / 1000);

                // Push time and start interval timer
                this.status = 'playing';
                this[0].push(time);
                this.timer = setInterval(fn, this.duration * 1000);
            }, (time > startTime ? startTime - time : 0));
        }

        return this;
    },

    stop: function(sendStopFrame) {
        // Already stopped?
        if (this.status === 'done') {
            return this;
        }

        // Cancel next frame
        if (this.duration === 'frame') {
            cancelAnimationFrame(this.timer);
        }
        // Cancel waiting timeout
        else if (this.status === 'waiting') {
            clearTimeout(this.timer) ;
        }
        // Cancel playing interval
        else {
            clearInterval(this.timer) ;
        }

        this.timer  = undefined;
        return stop(this);
    }
});
