import curry from '../curry.js';
const A = Array.prototype;

export const by = curry(function by(fn, a, b) {
    return fn(b) > fn(a);
}, true);

export function each(fn, object) {
    // A stricter version of .forEach, where the callback fn
    // gets a single argument and no context.
    var l, n;

    if (typeof object.each === 'function') {
        object.each(fn);
    }
    else {
        l = object.length;
        n = -1;
        while (++n < l) { fn(object[n]); }
    }

    return object;
};

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

export function concat(array2, array1) {
    // A.concat only works with arrays - it does not flatten array-like
    // objects. We need a robust concat that will glue any old thing
    // together.
    return Array.isArray(array1) ?
        // 1 is an array. Convert 2 to an array if necessary
        array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

    array1.concat ?
        // It has it's own concat method. Lets assume it's robust
        array1.concat(array2) :
    // 1 is not an array, but 2 is
    toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
};

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
