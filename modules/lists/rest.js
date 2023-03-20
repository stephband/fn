/**
rest(n, array)
**/

console.trace('fn/modules/lists/rest.js is now at fn/modules/rest.js');

export default function rest(i, object) {
    if (object.slice) { return object.slice(i); }
    if (object.rest)  { return object.rest(i); }

    var a = [];
    var n = object.length - i;
    while (n--) { a[n] = object[n + i]; }
    return a;
}
