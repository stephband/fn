// Throttle
//
// Returns a function that calls `fn` once on the next timer frame, using
// the context and arguments from the latest invocation.

import noop from './noop.js';
import requestTick from './request-tick.js';

export function throttle(fn, request = requestTick) {
    let promise;
    let context;
    let args;

    return function throttle() {
        context = this;
        args    = arguments;

        if (promise) { return; }

        promise = request(() => {
            promise = undefined;
            fn.apply(context, args);
        });
    };
}

export function Throttle(fn, request = requestTick, cancel = noop) {
    // If Throttle has been called without context
    if (!this) { return new Throttle(fn, request, cancel); }

    const data = this.data = {
        cancel: cancel
    };

    this.push = function throttle() {
        data.context = this;
        data.args    = arguments;

        if (data.id) { return; }

        data.id = request(() => {
            // Has throttle been stopped but for some reason cancel is
            // noop? Check the id to see.
            if (!data.id) { return; }

            data.id = undefined;
            fn.apply(data.context, data.args);
        });
    };
}

Throttle.prototype.stop = function() {
    const data = this.data;
    data.cancel(data.id);
    data.id = undefined;
    return this;
};
