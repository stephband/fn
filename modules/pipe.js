/*
pipe(fn1, fn2, ...)
*/

import apply from './apply.js';
import id from './id.js';

const A = Array.prototype;

export default function pipe() {
    const fns = arguments;
    return fns.length ?
        (value) => A.reduce.call(fns, apply, value) :
        id ;
}
