
/**
clamp(min, max, n)
**/

import curry from '../curry.js';

export function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n;
}

export default curry(clamp);
