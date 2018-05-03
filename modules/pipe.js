const A = Array.prototype;

function call(value, fn) {
    return fn(value);
}

export default function pipe() {
    const fns = arguments;
    return function pipe(value) {
        return A.reduce.call(fns, call, value);
    };
};
