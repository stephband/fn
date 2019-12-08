/*
compose(fn2, fn1)
*/

export default function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}
