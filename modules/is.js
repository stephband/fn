
/**
is(a, b)
Perform a strict equality check of `a === b`.
*/

import curry from './curry.js';

export const is = Object.is || function is(a, b) { return a === b; };

export default curry(is, true);
