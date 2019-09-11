import noop from './noop.js';

const done     = { done: true };
const iterator = { next: () => done };

export default Object.freeze({
    // Standard array methods
    shift: noop,
    push:  noop,

    // Stream methods
    stop:  noop,

    // Make it look like an empty array
    length: 0,

    // Make it an iterable with nothing in it
    [Symbol.iterator]: () => iterator
});
