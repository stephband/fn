export function requestTime(s, fn) {
    return setTimeout(fn, s * 1000);
}

export const cancelTime = clearTimeout;
