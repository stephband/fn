/**
cacheByKey(fn)
Returns a function that caches the output values of `fn(input)` against input
values, which are registered as keys in an object, such that for each input
key `fn` is only ever called once.
*/

let warned;

export default function cacheByKey(fn) {
    var map = {};

    return function cache(input) {
        if (window.DEBUG && !warned && input === undefined) {
            warned = true;
            console.warn('cacheByKey() called with undefined. Not illegal, but potentially bad.');
        }

        if (window.DEBUG && typeof input !== 'string' && typeof input !== 'number') {
            console.warn('cacheByKey() called with non-primitive input, coerced to string "' + input + '"');
        }

        if (window.DEBUG && arguments.length > 1) {
            console.warn('cacheByKey() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
        }

        return input in map ?
            map[input] :
            map[input] = fn(input) ;
    };
}
