
/**
insert(by, array, object)
Inserts `object` into `array` at the first index where the result of
`by(array[index], object)` is less than 1.
**/

const A = Array.prototype;

export default function insert(by, array, object) {
    console.warn('insert() has changed. Now expects a comparison fn.');
    let n = -1;
    while (array[++n] && by(array[n], object) < 1);
    A.splice.call(array, n, 0, object);
    return n;
}

/*
The old way:
export default function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A.splice.call(array, n, 0, object);
    return object;
}
*/
