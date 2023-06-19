
/**
nothing
A frozen array-like and stream-like object that contains no value.
**/

import arg  from './arg.js';
import id   from './id.js';
import noop from './noop.js';
import self from './self.js';

const create = Object.create;
const freeze = Object.freeze;

export default freeze(create(create(Object.prototype, {
    // Array methods
    at:        { value: noop },
    shift:     { value: noop },
    push:      { value: noop },
    forEach:   { value: noop },
    join:      { value: function() { return ''; } },
    every:     { value: function() { return true; } },
    filter:    { value: self },
    find:      { value: noop },
    findIndex: { value: function() { return -1; } },
    flat:      { value: self },
    flatMap:   { value: self },
    includes:  { value: function() { return false; } },
    indexOf:   { value: function() { return -1; } },
    map:       { value: self },
    reduce:    { value: arg(1) },
    sort:      { value: self },

   // Stream methods
    each:      { value: self },
    pipe:      { value: id },
    start:     { value: self },
    stop:      { value: self },
    done:      { value: self },

    // Primitive coercion
    valueOf:   { value: function() { return null; } }
}), {
    length: { value: 0 }
}));
