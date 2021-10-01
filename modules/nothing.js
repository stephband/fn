import noop from './noop.js';

const define = Object.defineProperties;
const freeze = Object.freeze;

function self() {
    return this;
}

export default freeze(define([], {
    // Make array and stream methods no-ops
    shift:   { value: noop },
    push:    { value: noop },
    each:    { value: noop },
    forEach: { value: noop },
    start:   { value: noop },
    stop:    { value: noop },
    done:    { value: noop },
    join:    { value: function() { return ''; } },
    map:     { value: self },
    filter:  { value: self },
    reduce:  { value: function(fn, accumulator) { return accumulator; } }
}));
