
/**
insert(by, array, object)
Inserts `object` into `array` at the first index where the result of
`by(array[index], object)` is less than 1. Returns the index of `object`.
**/

const A = Array.prototype;

export default function insert(by, array, object) {
    let lo = 0;
    let hi = array.length;

    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (by(array[mid], object) < 1) lo = mid + 1;
        else hi = mid;
    }

    A.splice.call(array, lo, 0, object);
    return lo;
}
