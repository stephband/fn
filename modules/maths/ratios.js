
import curry from '../curry.js';

/**
gcd(a, b)

Returns the greatest common divider of a and b.
**/

export function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
}

export const curriedGcd = curry(gcd);

/**
lcm(a, b)

Returns the lowest common multiple of a and b.
**/

export function lcm(a, b) {
    return a * b / gcd(a, b);
}

export const curriedLcm = curry(lcm);

/**
factorise(array)

Reduces a fraction (represented by `array` in the form
`[numerator, denominator]`) by finding the greatest common divisor and
dividing by it both values by it.

Returns a new array in the form `[numerator, denominator]`.
**/

export function factorise(array) {
    var f = gcd(array[0], array[1]);
    return [array[0] / f, array[1] / f];
}
