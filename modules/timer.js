/**
Timer(duration, getTime)

Create an object with a request/cancel pair of functions that
fires request(fn) callbacks at a given duration.
*/

/**
.request()
*/

/**
.cancel()
*/

/**
.now()
*/

import now from './now.js';
import requestTick from './request-tick.js';

export default function Timer(duration, getTime) {
    if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

    // Optional second argument is a function that returns
    // current time (in seconds)
    getTime = getTime || now;

    var fns = [];
    var id;
    var t0  = -Infinity;

    function frame() {
        var n = fns.length;

        id = undefined;
        t0 = getTime();

        while (n--) {
            fns.shift()(t0);
        }
    }

    return {
        now: getTime,

        request: function(fn) {
            if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

            // Add fn to queue
            fns.push(fn);

            // If the timer is cued do nothing
            if (id) { return; }

            var t1 = getTime();

            // Set the timer and return something truthy
            if (t0 + duration > t1) {
                id = setTimeout(frame, (t0 + duration - t1) * 1000);
            }
            else {
                requestTick(frame) ;
            }

            // Use the fn reference as the request id, because why not
            return fn;
        },

        cancel: function(fn) {
            var i = fns.indexOf(fn);
            if (i === -1) { return; }

            fns.splice(i, 1);

            if (!fns.length) {
                clearTimeout(id);
                id = undefined;
            }
        }
    };
}
