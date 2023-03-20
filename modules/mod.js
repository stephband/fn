/**
mod(divisor, n)

JavaScript's modulu operator (`%`) uses Euclidean division, but for
stuff that cycles through 0 the symmetrics of floored division are often
are more useful. This function implements floored division.
**/

import curry from './curry.js';

export function mod(d, n) {
    var value = n % d;
    return value < 0 ? value + d : value;
}

export default curry(mod);