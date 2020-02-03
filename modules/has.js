/*
has(key, value, object)
Returns `true` if `object[key]` is strictly equal to `value`.
*/

import curry from './curry.js';

export function has(key, value, object) {
    return object[key] === value;
}

export default curry(has, true);
