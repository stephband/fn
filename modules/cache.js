/**
cache(fn)
Returns a function that caches the output values of `fn(input)`
against input values in a map, such that for each input value
`fn` is only ever called once.
*/

const DEBUG = false;

export default function cache(fn) {
    var map = new Map();

    return function cache(object) {
        if (DEBUG && object === undefined) {
            throw new Error('Fn: cache() called with undefined.');
        }

        if (DEBUG && arguments.length > 1) {
            throw new Error('Fn: cache() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
        }

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}
