/*
once(fn)
*/


import noop from './noop.js';

export default function once(fn) {
    return function once() {
        var value = fn.apply(this, arguments);
        fn = noop;
        return value;
    };
}
