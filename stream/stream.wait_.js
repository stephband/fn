
import Stream from './stream.js';


// Stream Timers

import choke from './choke.js';

Stream.Choke = function(time) {
    return new Stream(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify();
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};

/**
.wait(time)
Emits the latest value only after `time` seconds of inactivity.
Other values are discarded.
*/

Stream.prototype.wait = function wait(time) {
    return this.pipe(Stream.Choke(time));
};
