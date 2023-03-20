/**
take(n, array)
**/

console.trace('fn/modules/lists/take.js is now at fn/modules/take.js');

export default function take(i, object) {
    if (object.slice) { return object.slice(0, i); }
    if (object.take)  { return object.take(i); }

    var a = [];
    var n = i;
    while (n--) { a[n] = object[n]; }
    return a;
}
