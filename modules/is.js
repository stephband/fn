
/*
is(a, b)
Perform a strict equality check of `a === b`.
*/


export default Object.is || function is(a, b) { return a === b; };
