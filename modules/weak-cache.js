const DEBUG = false;

export default function weakCache(fn) {
    var map = new WeakMap();

    return function weakCache(object) {
        if (DEBUG && object === undefined) {
            throw new Error('Fn: weakCache() called with undefined.');
        }

        if (DEBUG && arguments.length > 1) {
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
