import curry from '../curry.js';

/**
clamp(min, max, n)
**/

export function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n;
}

export default curry(clamp);
