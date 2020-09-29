
import Stream from './stream.js';


// Frame timer

var frameTimer = {
    now:     now,
//    request: requestAnimationFrame.bind(window),
//    cancel:  cancelAnimationFrame.bind(window)
};


// Stream.throttle

function schedule() {
    this.queue = noop;
    this.ref   = this.timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        this.queue = schedule;
        notify();
    };
}

assign(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream.throttle = function(timer) {
    return new Stream(function(notify, stop) {
        timer = typeof timer === 'number' ? new Timer(timer) :
            timer ? timer :
            frameTimer;

        return new ThrottleSource(notify, stop, timer);
    });
};

/**
.throttle(time)
Throttles values such that the latest value is emitted every `time` seconds.
Other values are discarded. The parameter `time` may also be a timer options
object, an object with `{ request, cancel, now }` functions,
allowing the creation of, say, and animation frame throttle.
*/

Stream.prototype.throttle = function throttle(timer) {
    return this.pipe(Stream.throttle(timer));
}
