
import curry from './curry.js';
import gcd   from './gcd.js';

/**
lcm(a, b)

Returns the lowest common multiple of `a` and `b`.
**/

export function lcm(a, b) {
    return a * b / gcd(a, b);
}

export default curry(lcm);
