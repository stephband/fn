
// #e2006f
// #332256

if (window.console && window.console.log) {
    window.console.log('%cFn%c          - https://github.com/stephband/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
}

import './js/observable.js';

import curry from './modules/curry.js';

export { curry as curry };
export { default as print }       from './modules/print.js';
export { default as args }        from './modules/args.js';
export { default as cache }       from './modules/cache.js';
export { default as choke }       from './modules/choke.js';
export { default as choose }      from './modules/choose.js';
export { default as compose }     from './modules/compose.js';
export { default as deprecate }   from './modules/deprecate.js';
export { default as id }          from './modules/id.js';
export { default as isDefined }   from './modules/is-defined.js';
export { default as latest }      from './modules/latest.js';
export { default as noop }        from './modules/noop.js';
export { default as nothing }     from './modules/nothing.js';
export { default as now }         from './modules/now.js';
export { default as once }        from './modules/once.js';
export { default as overload }    from './modules/overload.js';
export { default as pipe }        from './modules/pipe.js';
export { default as privates }    from './modules/privates.js';
export { default as requestTick } from './modules/request-tick.js';
export { default as self }        from './modules/self.js';
export { default as throttle }    from './modules/throttle.js';
export { default as toArray }     from './modules/to-array.js';
export { default as toClass }     from './modules/to-class.js';
export { default as toInt }       from './modules/to-int.js';
export { default as toString }    from './modules/to-string.js';
export { default as toType }      from './modules/to-type.js';
export { default as weakCache }   from './modules/weak-cache.js';
export { default as Functor }     from './modules/functor.js';
export { default as Observable }  from './modules/observe-stream.js';
export { default as ObserveStream } from './modules/observe-stream.js';
export { default as Stream }      from './modules/stream.js';
export { default as Timer }       from './modules/timer.js';
export { default as Pool }        from './modules/pool.js';

export function not(a) { return !a; };
export const toFloat = parseFloat;
export const and     = curry(function and(a, b) { return !!(a && b); });
export const or      = curry(function or(a, b) { return a || b; });
export const xor     = curry(function xor(a, b) { return (a || b) && (!!a !== !!b); });

import _equals      from './modules/equals.js';
import _exec        from './modules/exec.js';
import _get         from './modules/get.js';
import _has         from './modules/has.js';
import _is          from './modules/is.js';
import _invoke      from './modules/invoke.js';
import _matches     from './modules/matches.js';
import _parse       from './modules/parse.js';
import _set         from './modules/set.js';
import _toFixed     from './modules/to-fixed.js';
import { getPath as _getPath, setPath as _setPath } from './modules/paths.js';

export const assign      = curry(Object.assign, true, 2);
export const define      = curry(Object.defineProperties, true, 2);
export const equals      = curry(_equals, true);
export const exec        = curry(_exec);
export const get         = curry(_get, true);
export const has         = curry(_has, true);
export const is          = curry(_is, true);
export const invoke      = curry(_invoke, true);
export const matches     = curry(_matches, true);
export const parse       = curry(_parse);
export const set         = curry(_set, true);
export const toFixed     = curry(_toFixed);
export const getPath     = curry(_getPath, true);
export const setPath     = curry(_setPath, true);


/* Lists */

import * as lists   from './modules/lists/core.js';
import _ap          from './modules/lists/ap.js';
import _rest        from './modules/lists/rest.js';
import _remove      from './modules/lists/remove.js';
import _take        from './modules/lists/take.js';
import _unique      from './modules/lists/unique.js';
import _update      from './modules/lists/update.js';
import _diff        from './modules/lists/diff.js';
import _intersect   from './modules/lists/intersect.js';
import _unite       from './modules/lists/unite.js';

export { default as last }   from './modules/lists/last.js';
export { default as unique } from './modules/lists/unique.js';

export const by          = curry(lists.by, true);
export const byAlphabet  = curry(lists.byAlphabet);

export const ap          = curry(_ap, true);
export const concat      = curry(lists.concat, true);
export const contains    = curry(lists.contains, true);
export const each        = curry(lists.each, true);
export const filter      = curry(lists.filter, true);
export const find        = curry(lists.find, true);
export const insert      = curry(lists.insert, true);
export const map         = curry(lists.map, true);
export const reduce      = curry(lists.reduce, true);
export const remove      = curry(_remove, true);
export const rest        = curry(_rest, true);
export const slice       = curry(lists.slice, true, 3);
export const sort        = curry(lists.sort, true);
export const take        = curry(_take, true);
export const update      = curry(_update, true);

export const diff        = curry(_diff, true);
export const intersect   = curry(_intersect, true);
export const unite       = curry(_unite, true);

/* Strings */

import _append      from './modules/strings/append.js';
import _prepend     from './modules/strings/prepend.js';
import _prepad      from './modules/strings/prepad.js';
import _postpad     from './modules/strings/postpad.js';

export const append      = curry(_append);
export const prepend     = curry(_prepend);
export const prepad      = curry(_prepad);
export const postpad     = curry(_postpad);

export { default as slugify }      from './modules/strings/slugify.js';
export { default as toPlainText }  from './modules/strings/to-plain-text.js';
export { default as toStringType } from './modules/strings/to-string-type.js';


/* Numbers */

import * as maths      from './modules/maths/core.js';
import _normalise      from './modules/maths/normalise.js';
import _denormalise    from './modules/maths/denormalise.js';
import _exponentialOut from './modules/maths/exponential-out.js';
import _cubicBezier    from './modules/maths/cubic-bezier.js';
import _rangeLog       from './modules/maths/range-log.js';
import _rangeLogInv    from './modules/maths/range-log-inv.js';

export { gaussian, todB, toLevel, toRad, toDeg } from './modules/maths/core.js';
export { default as toPolar }     from './modules/maths/to-polar.js';
export { default as toCartesian } from './modules/maths/to-cartesian.js';

export const add         = curry(maths.add);
export const multiply    = curry(maths.multiply);
export const min         = curry(maths.min);
export const max         = curry(maths.max);
export const mod         = curry(maths.mod);
export const pow         = curry(maths.pow);
export const exp         = curry(maths.exp);
export const log         = curry(maths.log);
export const gcd         = curry(maths.gcd);
export const lcm         = curry(maths.lcm);
export const root        = curry(maths.root);
export const limit       = curry(maths.limit);
export const wrap        = curry(maths.wrap);
export const factorise   = curry(maths.factorise);
export const cubicBezier = curry(_cubicBezier);
export const normalise   = curry(_normalise);
export const denormalise = curry(_denormalise);
export const exponentialOut = curry(_exponentialOut);
export const rangeLog    = curry(_rangeLog);
export const rangeLogInv = curry(_rangeLogInv);

/* Time */

export * from './modules/time/core.js';

/* Test */

export { default as test } from './modules/test.js';
