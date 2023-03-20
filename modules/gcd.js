
import curry from './curry.js';

/**
gcd(a, b)

Returns the greatest common divider of `a` and `b`.
**/

export function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
}

export default curry(gcd);
