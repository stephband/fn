export default function equals(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return true; }

    // Or if values are not objects
    if (a === null ||
        b === null ||
        typeof a !== 'object' ||
        typeof b !== 'object') {
        return false;
    }

    var akeys = Object.keys(a);
    var bkeys = Object.keys(b);

    // Are their enumerable keys different?
    if (akeys.length !== bkeys.length) { return false; }

    var n = akeys.length;

    while (n--) {
        if (!equals(a[akeys[n]], b[akeys[n]])) {
            return false;
        }
    }

    return true;
}
