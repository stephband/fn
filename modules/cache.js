/**
cache(fn)
Returns a function that caches the output values of `fn(input)`
against input values in a map, such that for each input value
`fn` is only ever called once.
*/

export default function cache(fn) {
    var map = new Map();

    return function cache(object) {
        if (false && object === undefined) {
            console.warn('cache() called with undefined.');
        }

        if (false && arguments.length > 1) {
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
