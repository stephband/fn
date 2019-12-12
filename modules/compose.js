/*
compose(fn2, fn1)
Calls `fn1`, passes the result to `fn2`, and returns that result.
*/

export default function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}
