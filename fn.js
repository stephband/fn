import choose   from './modules/choose.js';
import curry    from './modules/curry.js';
import overload from './modules/overload.js';
import _rest    from './modules/rest.js';
import { get as _get, set as _set } from './modules/get.js';

console.log('Fn module');

export default window.Fn;
export const rest    = curry(_rest);
export const get     = curry(_get);
export const set     = curry(_set);
export const sum     = Fn.add;
export const getPath = Fn.getPath;
export { choose, curry, overload }
