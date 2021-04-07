
/** 
compile(scope, paramString, code, context)

Compiles a new function from `code` that runs in `scope` with the arguments 
listed in `paramString`. If a `context` is passed in, you get an arrow function,
otherwise a normal function (leaving you the possibility to set the context at 
runtime with `fn.apply(context, params)`).
**/

export default function compile(scope, paramString, code, context) {
    const keys   = Object.keys(scope);
    const values = Object.values(scope);
    return context ?
        // The arrow function has it's context set
        new Function(...keys, 'return (' + paramString + ') => {' + (code || '') + '}')
        .apply(context, values) :
        // This function can be called with a context fn.call(context, data)
        new Function(...keys, 'return function(' + paramString + '){' + (code || '') + '}')
        .apply(null, values) ;
}
