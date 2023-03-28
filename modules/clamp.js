
/**
clamp(min, max, n)
Clamps number `n` to the limits `min` to `max`. Values of `n` lower than `min`
return `min`, and those higher than `max` return `max`.
**/

import curry from './curry.js';

export function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n;
}

export default curry(clamp);
