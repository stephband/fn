/**
cache(fn)
Returns a function that caches the output values of `fn(input)`
against input values in a map, such that for each input value
`fn` is only ever called once.
*/

let warned;

export default function cache(fn) {
    var map = new Map();

    return function cache(object) {
        if (window.DEBUG && !warned && object === undefined) {
            warned = true;
            console.warn('cache() called with undefined.');
        }

        if (window.DEBUG && arguments.length > 1) {
            console.warn('cache() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
        }

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}
