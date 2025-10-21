
/**
equals(a, b)
Compares `a` and `b` for deep equality and returns `true` where they are equal,
otherwise false.
**/

//import curry from './curry.js';

export default function equals(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return true; }

    // If either of the values is null, or not an object, we already know
    // they're not equal so get out of here
    if (a === null ||
        b === null ||
        typeof a !== 'object' ||
        typeof b !== 'object') {
        return false;
    }

    // Compare their enumerable keys
    const akeys = Object.keys(a);
    const bkeys = Object.keys(b);

    let n = akeys.length;
    while (n--) {
        // Has the property been set to undefined on a?
        if (a[akeys[n]] === undefined) {
            // We don't want to test if it is an own property of b, as
            // undefined represents an absence of value
            if (b[akeys[n]] !== undefined) {
                return false;
            }
        }
        else {
            // console.log(equals(a[akeys[n]], b[akeys[n]]), akeys[n], a[akeys[n]], b[akeys[n]]);
            if (!b.hasOwnProperty(akeys[n]) || !equals(a[akeys[n]], b[akeys[n]])) {
                return false;
            }
        }

        const i = bkeys.indexOf(akeys[n]);
        if (i > -1) {
            bkeys.splice(i, 1);
        }
    }

    n = bkeys.length;
    while (n--) {
        // Has the property been set to undefined on b?
        if (b[bkeys[n]] === undefined) {
            if (a[bkeys[n]] !== undefined) {
                return false;
            }
        }
        else {
            // We already know a does not have own property bkeys[n], because
            // we have already been through all the enumerable properties
            return false;
        }
    }

    return true;
}

//export default curry(equals, true);
