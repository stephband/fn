
/** 
compile(scope, context, paramString, code)
Creates a new function from `code` that runs in `scope`.
**/

export default function compileFn(scope, paramString, code) {
    const keys   = Object.keys(scope);
    const values = Object.values(scope);
    const fn     = new Function(...keys, 'return function(' + paramString + ') => {' + code + '};');
    return fn(...values);
}
