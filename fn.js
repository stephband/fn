import './js/fn.js';
import './js/observable.js';
import './js/stream.js';
import './js/stream.observe.js';
import './js/stream.js';

import choose   from './modules/choose.js';
import curry    from './modules/curry.js';
import overload from './modules/overload.js';
import _rest    from './modules/rest.js';
import { get as _get, set as _set } from './modules/get.js';

export default window.Fn;

export const rest      = curry(_rest);
export const get       = curry(_get);
export const set       = curry(_set);
export const sum       = Fn.add;
export const getPath   = Fn.getPath;
export const id        = Fn.id;
export const noop      = Fn.noop;
export const nothing   = Fn.nothing;
export const args      = Fn.args;
export const self      = Fn.self;
export const cache     = Fn.cache;
export const compose   = Fn.compose;
//export const curry     = Fn.curry;
//export const choose    = Fn.choose;
export const flip      = Fn.flip;
export const once      = Fn.once;
export const nth       = Fn.nth;
//export const overload  = Fn.overload;
export const pipe      = Fn.pipe;
export const throttle  = Fn.Throttle;
export const wait      = Fn.Wait;
export const weakCache = Fn.weakCache;

export const limit       = Fn.limit;
export const pow         = Fn.pow;
export const toCartesian = Fn.toCartesian;
export const toPolar     = Fn.toPolar;

export { choose, curry, overload }
