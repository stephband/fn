/*
once(fn)
Returns a function that calls `fn` the first time it is invoked,
and then becomes a noop.
*/

import noop from './noop.js';

export default function once(fn) {
    return function once() {
        var value = fn.apply(this, arguments);
        fn = noop;
        return value;
    };
}
