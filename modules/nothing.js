

import arg  from './arg.js';
import id   from './id.js';
import noop from './noop.js';
import self from './self.js';

const assign = Object.assign;
const create = Object.create;
const freeze = Object.freeze;

function returnTrue() { return true; }
function negative()   { return -1; }

export default freeze(assign(create({
    // Array methods
    shift:     noop,
    push:      noop,
    forEach:   noop,
    join:      function() { return ''; },
    every:     returnTrue,
    filter:    self,
    find:      noop,
    findIndex: negative,
    flat:      self,
    flatMap:   self,
    includes:  function() { return false; },
    indexOf:   negative,
    map:       self,
    reduce:    arg(1),
    sort:      self,

   // Stream methods
    each:      self,
    pipe:      id,
    start:     self,
    stop:      self,
    done:      self,

    // Primitive coercion
    valueOf:   function() { return null; }
}), {
    length:    0,
}));
