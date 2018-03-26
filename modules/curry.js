function curry(fn) {
    var parity = fn.length;
    return function curried() {
        return arguments.length >= parity ?
            fn.apply(null, arguments) :
            curried.bind(null, ...arguments) ;
    };
}

export default curry;
