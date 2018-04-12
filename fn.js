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

var Fn     = window.Fn;

export default Fn;

export const rest      = curry(_rest);
export const get       = curry(_get);
export const set       = curry(_set);
export const sum       = Fn.add;
export const assign    = Fn.assign;
export const getPath   = Fn.getPath;
export const id        = Fn.id;
export const isDefined = Fn.isDefined;
export const noop      = Fn.noop;
export const nothing   = Fn.nothing;
export const args      = Fn.args;
export const self      = Fn.self;
export const toString  = Fn.toString;
export const cache     = Fn.cache;
export const compose   = Fn.compose;
//export const curry     = Fn.curry;
//export const choose    = Fn.choose;
export const flip      = Fn.flip;
export const is        = Fn.is;
export const once      = Fn.once;
export const nth       = Fn.nth;
//export const overload  = Fn.overload;
export const pipe      = Fn.pipe;
export const throttle  = Fn.Throttle;
export const wait      = Fn.Wait;
export const weakCache = Fn.weakCache;
export const update    = Fn.update;

export const limit       = Fn.limit;
export const pow         = Fn.pow;
export const toCartesian = Fn.toCartesian;
export const toPolar     = Fn.toPolar;
export const Stream      = window.Stream;

export { choose, curry, overload }
