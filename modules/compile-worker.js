
/**
compileWorker(code)
Creates a worker from a string of JS `code`. This guards against cross origin
issues that can happen when attempting to import worker scripts. If Web Workers
are not very carefully served they can be extremely brittle.
**/

const defaults = { type: 'module' };

export default function compileWorker(code, options = defaults) {
    const blob = new Blob([code], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    return new Worker(url, options);
}
