
import id   from './id.js';
import noop from './noop.js';

const freeze = Object.freeze;

function self() {
    return this;
}

export default freeze({
    // Array methods
    shift:   noop,
    push:    noop,
    forEach: noop,
    join:    function() { return ''; },
    map:     self,
    filter:  self,
    reduce:  function(fn, accumulator) { return accumulator; },
    length:  0,

   // Stream methods
    each:    noop,
    pipe:    id  ,
    start:   noop,
    stop:    noop,
    done:    noop,

    // Primitive coercion
    valueOf: function() { return null; }
});
