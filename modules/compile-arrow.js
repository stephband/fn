/** 
compile(scope, context, paramString, code)
Creates a new arrow function from `code` that runs in `scope` with `context`.
**/

export default function compileArrow(scope, context, paramString, code) {
    const keys   = Object.keys(scope);
    const values = Object.values(scope);
    const fn     = new Function(...keys, 'return (' + paramString + ') => ' + code + ';');
    return fn.apply(context, values);
}
