/*
pipe(fn1, fn2, ...)
Returns a function that calls `fn1`, `fn2`, etc., passing the result of
calling one function to the next and returning the the last result.
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
