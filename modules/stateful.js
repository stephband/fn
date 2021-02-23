
export function stateful(fn, data) {
    return function(value) {
        return fn(data, value);
    };
}


export function s(fn) {
    return (value) => (value === undefined ? value : fn(value));
}
