
/**
deep(a, b)
Perform a deep assign of b to a
**/

import curry from './curry.js';

export function deep(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return a; }

    // If b is null, or not an object, get out of here
    if (b === null || typeof b !== 'object') {
        return a;
    }

    // Get enumerable keys of b
    const bkeys = Object.keys(b);
    let n = bkeys.length;

    while (n--) {
        const key = bkeys[n];
        const value = b[key];

        a[key] = typeof value === 'object' && value !== null ?
            deep(a[key] || {}, value) :
            value ;
    }

    return a;
}

export default curry(deep, true);
