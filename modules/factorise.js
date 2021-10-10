
import gcd   from './gcd.js';

/**
factorise(array)

Reduces a fraction, represented by array-like in the form
`[numerator, denominator]`, by finding the greatest common divisor and dividing
both values by it.

Returns a new array in the form `[numerator, denominator]`.
**/

export default function factorise(array) {
    var f = gcd(array[0], array[1]);
    return [array[0] / f, array[1] / f];
}
