
import Timer from './timer.js';
import Stream from './stream.js';

const assign = Object.assign;

// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify();
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify();
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});


/**
Stream.fromTimer(duration, getCurrentTime)
Create a TimeStream from a `duration` in seconds and a `getCurrentTime` 
function that should return current time in seconds.
**/

/**
Stream.fromTimer(timer)
Create a TimeStream from a `timer` object. A `timer` is an object
with the properties:

```
{
    request:     fn(fn), calls fn on the next frame, returns an id
    cancel:      fn(id), cancels request with id
    now:         fn(), returns the time
    currentTime: time at the start of the latest frame
}
```

Here is how a stream of animation frames may be created:

```
const frames = Stream.fromTimer({
    request: window.requestAnimationFrame,
    cancel: window.cancelAnimationFrame,
    now: () => window.performance.now()
});
```

A TimeStream is not pushable.
**/

export default Stream.fromTimer = function TimeStream(duration, getCurrentTime) {
    return new Stream(function(push, stop) {
        const timer = typeof duration === 'number' ?
            new Timer(duration, getCurrentTime) :
            duration ;

        return new TimeSource(push, stop, timer);
    });
};
