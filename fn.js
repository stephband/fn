import './js/fn.js';
import './js/observable.js';
import './js/stream.js';
import './js/stream.observe.js';
import './js/stream.js';

var Fn = window.Fn;

import curry from './modules/curry.js';

export { Fn as Fn, curry as curry };
export { default as args }      from './modules/args.js';
export { default as cache }     from './modules/cache.js';
export { default as choose }    from './modules/choose.js';
export { default as compose }   from './modules/compose.js';
export { default as deprecate } from './modules/deprecate.js';
export { default as id }        from './modules/id.js';
export { default as isDefined } from './modules/is-defined.js';
export { default as last }      from './modules/last.js';
export { default as noop }      from './modules/noop.js';
export { default as nothing }   from './modules/nothing.js';
export { default as once }      from './modules/once.js';
export { default as overload }  from './modules/overload.js';
export { default as pipe }      from './modules/pipe.js';
export { default as self }      from './modules/self.js';
export { default as toArray }   from './modules/to-array.js';
export { default as toClass }   from './modules/to-class.js';
export { default as toInt }     from './modules/to-int.js';
export { default as toString }  from './modules/to-string.js';
export { default as toType }    from './modules/to-type.js';
export { default as weakCache } from './modules/weak-cache.js';

import _equals   from './modules/equals.js';
import _get      from './modules/get.js';
import _is       from './modules/is.js';
import _invoke   from './modules/invoke.js';
import _nth      from './modules/nth.js';
import _parse    from './modules/parse.js';
import _rest     from './modules/rest.js';
import _remove   from './modules/remove.js';
import _set      from './modules/set.js';
import { getPath as _getPath, setPath as _setPath } from './modules/paths.js';

export default Fn;

export const assign    = curry(Object.assign, true, 2);
export const define    = curry(Object.defineProperties, true, 2);
export const equals    = curry(_equals, true);
export const get       = curry(_get, true);
export const is        = curry(_is, true);
export const invoke    = curry(_invoke, true);
export const nth       = curry(_nth);
export const parse     = curry(_parse);
export const remove    = curry(_remove, true);
export const rest      = curry(_rest, true);
export const set       = curry(_set, true);
export const getPath   = curry(_getPath, true);
export const setPath   = curry(_setPath, true);

export const sum       = Fn.add;
export const flip      = Fn.flip;
export const throttle  = Fn.Throttle;
export const wait      = Fn.Wait;
export const update    = Fn.update;

export const limit       = Fn.limit;
export const pow         = Fn.pow;
export const toCartesian = Fn.toCartesian;
export const toPolar     = Fn.toPolar;
export const Stream      = window.Stream;
