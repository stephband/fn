
function curry(fn, arity, args) {
    return function apply() {
        return args.length + arguments.length < arity ?
            curry(fn, arity, [...args, ...arguments]) :
            fn.call(this, ...args, ...arguments) ;
    };
}

export default function(fn, arity=fn.length) {
    return arity < 2 ? fn : function apply() {
        return arguments.length < arity ?
            curry(fn, arity, arguments) :
            fn.apply(this, arguments) ;
    };
}
