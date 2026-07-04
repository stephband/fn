
// Mock requestAnimationFrame for Deno tests. Deno has no rAF, so approximate a
// frame with a macrotask timed to a nominal 60fps. Import this (for its side
// effect) into any test file that exercises frame-scheduled code.

const frame     = 1000 / 60;
const callbacks = new Map();
let id = 0;

globalThis.requestAnimationFrame ??= function requestAnimationFrame(callback) {
    const handle = ++id;
    callbacks.set(handle, setTimeout(() => {
        callbacks.delete(handle);
        callback(performance.now());
    }, frame));
    return handle;
};

globalThis.cancelAnimationFrame ??= function cancelAnimationFrame(handle) {
    const timer = callbacks.get(handle);
    if (timer === undefined) return;
    clearTimeout(timer);
    callbacks.delete(handle);
};
