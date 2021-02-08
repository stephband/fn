
/** 
compileAsyncFunction(scope, paramString, code, context)

Compiles a new async function from `code` that runs in `scope` with the 
arguments listed in `paramString`. If a `context` is passed in, you get an 
async arrow function, otherwise an async function (leaving you the possibility 
to set the context at runtime by invoking it as a method, 
or via `fn.apply(context, params)`).
**/

export default function compileAsyncFunction(scope, paramString, code, context, name) {
    const keys   = Object.keys(scope);
    const values = Object.values(scope);
    return context ?
        // The arrow function has it's context set
        new Function(...keys, 'return async (' + paramString + ') => {' + (code || '') + '}')
        .apply(context, values) :
        // This function can be called with a context fn.call(context, data)
        new Function(...keys, 'return async function' + (name ? ' ' + name : '') + '(' + paramString + '){' + (code || '') + '}')
        .apply(null, values) ;
}
