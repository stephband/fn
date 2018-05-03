export default function cache(fn) {
    var map = new Map();

    return function cache(object) {
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
};
