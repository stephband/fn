
import './js/observable.js';

import curry from './modules/curry.js';

export { curry as curry };
export { default as args }        from './modules/args.js';
export { default as cache }       from './modules/cache.js';
export { default as choke }       from './modules/choke.js';
export { default as choose }      from './modules/choose.js';
export { default as compose }     from './modules/compose.js';
export { default as deprecate }   from './modules/deprecate.js';
export { default as id }          from './modules/id.js';
export { default as isDefined }   from './modules/is-defined.js';
export { default as last }        from './modules/last.js';
export { default as latest }      from './modules/latest.js';
export { default as noop }        from './modules/noop.js';
export { default as nothing }     from './modules/nothing.js';
export { default as now }         from './modules/now.js';
export { default as once }        from './modules/once.js';
export { default as overload }    from './modules/overload.js';
export { default as pipe }        from './modules/pipe.js';
export { default as requestTick } from './modules/request-tick.js';
export { default as self }        from './modules/self.js';
export { default as toArray }     from './modules/to-array.js';
export { default as toClass }     from './modules/to-class.js';
export { default as toInt }       from './modules/to-int.js';
export { default as toString }    from './modules/to-string.js';
export { default as toType }      from './modules/to-type.js';
export { default as weakCache }   from './modules/weak-cache.js';
export { default as Functor }     from './modules/functor.js';
export { default as Observable }  from './modules/observable.js';
export { default as Stream }      from './modules/stream.js';
export { default as Timer }       from './modules/timer.js';
export { default as Pool }        from './modules/pool.js';

export const toFloat = parseFloat;

import _each        from './modules/each.js';
import _equals      from './modules/equals.js';
import _get         from './modules/get.js';
import _is          from './modules/is.js';
import _invoke      from './modules/invoke.js';
import _nth         from './modules/nth.js';
import _parse       from './modules/parse.js';
import _rest        from './modules/rest.js';
import _remove      from './modules/remove.js';
import _set         from './modules/set.js';
import _toFixed     from './modules/to-fixed.js';
import { getPath as _getPath, setPath as _setPath } from './modules/paths.js';


export const assign      = curry(Object.assign, true, 2);
export const define      = curry(Object.defineProperties, true, 2);
export const equals      = curry(_equals, true);
export const get         = curry(_get, true);
export const is          = curry(_is, true);
export const invoke      = curry(_invoke, true);
export const nth         = curry(_nth);
export const parse       = curry(_parse);
export const remove      = curry(_remove, true);
export const rest        = curry(_rest, true);
export const set         = curry(_set, true);
export const toFixed     = curry(_toFixed);
export const getPath     = curry(_getPath, true);
export const setPath     = curry(_setPath, true);


/* Strings */

import _append      from './modules/strings/append.js';
import _prepend     from './modules/strings/prepend.js';
export const append      = curry(_append, true);
export const prepend     = curry(_prepend);

export { default as slugify } from './modules/strings/slugify.js';

/* Numbers */

import * as maths   from './modules/maths/core.js';
import _normalise   from './modules/maths/normalise.js';
import _denormalise from './modules/maths/denormalise.js';

export { todB, toLevel, toRad, toDeg } from './modules/maths/core.js';
export const add         = curry(maths.add);
export const multiply    = curry(maths.multiply);
export const min         = curry(maths.min);
export const max         = curry(maths.max);
export const mod         = curry(maths.mod);
export const pow         = curry(maths.pow);
export const exp         = curry(maths.exp);
export const log         = curry(maths.log);
export const root        = curry(maths.root);
export const normalise   = curry(_normalise);
export const denormalise = curry(_denormalise);


/* Time */

export * from './modules/time/core.js';


/*
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
*/
