/**
reduce(fn, accumulator)
**/

export default function reduce(fn, value) {
    return function() {
        return (value = fn(value, ...arguments));
    };
}
