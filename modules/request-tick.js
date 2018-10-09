const resolved = Promise.resolve();

export default function requestTick(fn) {
    resolved.then(fn);
    return fn;
}
