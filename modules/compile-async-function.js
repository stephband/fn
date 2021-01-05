
/**
compileAsyncFunction(scope, paramString, code)
Creates a new async function from `code` that runs in `scope`.
**/

export default function compileAsyncFn(scope, paramString, code) {
    const keys   = Object.keys(scope);
    const values = Object.values(scope);
    const fn     = new Function(...keys, 'return async function(' + paramString + '){' + code + '}');
    return fn(...values);
}
