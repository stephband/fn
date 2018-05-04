const A = Array.prototype;

export function map(fn, object) {
    return object && object.map ? object.map(fn) : A.map.call(object, fn) ;
}

export function filter(fn, object) {
    return object.filter ?
        object.filter(fn) :
        A.filter.call(object, fn) ;
}

export function reduce(fn, seed, object) {
    return object.reduce ?
        object.reduce(fn, seed) :
        A.reduce.call(object, fn, seed);
}

export function contains(value, object) {
    return object.includes ?
        object.includes(value) :
    object.contains ?
        object.contains(value) :
    A.includes ?
        A.includes.call(object, value) :
        A.indexOf.call(object, value) !== -1 ;
};

export function find(fn, object) {
    return A.find.call(object, fn);
}

export function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A.splice.call(array, n, 0, object);
}

export function slice(n, m, object) {
    return object.slice ?
        object.slice(n, m) :
        A.slice.call(object, n, m) ;
}
