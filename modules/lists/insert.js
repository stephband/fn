
/**
insert(fn, array, object)
Inserts `object` into `array` at the first index where the result of
`fn(object)` is greater than `fn(array[index])`.
**/

import curry  from '../curry.js';

const A = Array.prototype;

export function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A.splice.call(array, n, 0, object);
    return object;
}

export default curry(insert);
