import noop from './noop.js';

const done     = { done: true };
const iterator = { next: () => done };

export default Object.freeze({
    // Make array and stream methods no-ops
    shift:   noop,
    push:    noop,
    each:    noop,
    forEach: noop,
    start:   noop,
    stop:    noop,
    done:    noop,

    join:    function() { return ''; },
    map:     function() { return this; },
    filter:  function() { return this; },
    indexOf: function() { return -1; },

    // Make it look like an empty array
    length: 0,

    // Make it an iterable with nothing in it
    [Symbol.iterator]: () => iterator
});
