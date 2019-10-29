
const A = Array.prototype;

export default function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A.splice.call(array, n, 0, object);
    return object;
}
