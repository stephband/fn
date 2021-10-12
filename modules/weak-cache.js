/**
weakCache(fn)
Returns a function that caches the return values of `fn()`
against input values in a WeakMap, such that for each input value
`fn` is only ever called once.
*/

export default function weakCache(fn) {
    var map = new WeakMap();

    return function weakCache(object) {
        if (false && object === undefined) {
            throw new Error('Fn: weakCache() called with undefined.');
        }

        if (false && arguments.length > 1) {
            throw new Error('Fn: weakCache() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
        }

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}
