
// #e2006f
// #332256

if (window.console && window.console.log) {
    window.console.log('%cFn%c          - https://stephen.band/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
}

import curry from './modules/curry.js';
import choose from './modules/choose.js';

export { curry, choose };
export * from './modules/throttle.js';
export { default as PromiseThrottle } from './modules/promise-throttle.js';
export { default as print }       from './modules/print.js';

export { default as args }        from './modules/args.js';
export { default as argument }    from './modules/argument.js';
export { default as cache }       from './modules/cache.js';
export { default as call }        from './modules/call.js';
export { default as capture }     from './modules/capture.js';
export { default as choke }       from './modules/choke.js';
export { default as compose }     from './modules/compose.js';
export { default as deprecate }   from './modules/deprecate.js';
export { default as equals }      from './modules/equals.js';
export { default as exec }        from './modules/exec.js';
export { default as get }         from './modules/get.js';
export { default as getPath }     from './modules/get-path.js';
export { default as has }         from './modules/has.js';
export { default as id }          from './modules/id.js';
export { default as invoke }      from './modules/invoke.js';
export { default as is }          from './modules/is.js';
export { default as isDefined }   from './modules/is-defined.js';
export { default as latest }      from './modules/latest.js';
export { default as matches }     from './modules/matches.js';
export { default as noop }        from './modules/noop.js';
export { default as not }         from './modules/not.js';
export { default as nothing }     from './modules/nothing.js';
export { default as now }         from './modules/now.js';
export { default as once }        from './modules/once.js';
export { default as overload }    from './modules/overload.js';
export { default as parseInt }    from './modules/parse-int.js';
export { default as parseValue }  from './modules/parse-value.js';
export { default as pipe }        from './modules/pipe.js';
export { default as Privates }    from './modules/privates.js';
export { default as self }        from './modules/self.js';
export { default as set }         from './modules/set.js';
export { default as setPath }     from './modules/set-path.js';
export { default as toArray }     from './modules/to-array.js';
export { default as toClass }     from './modules/to-class.js';
export { default as toFixed }     from './modules/to-fixed.js';
export { default as toString }    from './modules/to-string.js';
export { default as toType }      from './modules/to-type.js';
export { default as weakCache }   from './modules/weak-cache.js';
export { default as Fn }          from './modules/fn.js';
export { default as Observable }  from './modules/observe-stream.js';
export { default as mutations }   from './modules/observe-stream.js';
export { default as Stream }      from './modules/stream.js';
export { default as Timer }       from './modules/timer.js';
export { default as Pool }        from './modules/pool.js';
export { Observer, Target, notify } from './modules/observer/observer.js';
export { observe }                from './modules/observer/observe.js';

/* Strings */

export { default as toCamelCase } from './modules/to-camel-case.js';
export { default as toPlainText } from './modules/to-plain-text.js';
export { default as toStringType } from './modules/to-string-type.js';

export { default as append }      from './modules/strings/append.js';
export { default as prepend }     from './modules/strings/prepend.js';
export { default as prepad }      from './modules/strings/prepad.js';
export { default as postpad }     from './modules/strings/postpad.js';
export { default as slugify }     from './modules/strings/slugify.js';

export { default as requestTick } from './modules/request-tick.js';
import { requestTime as _requestTime } from './modules/request-time.js';
export const requestTime = curry(_requestTime, true, 2);
export { cancelTime }             from './modules/request-time.js';

export const toFloat = parseFloat;
export const and     = curry(function and(a, b) { return !!(a && b); });
export const or      = curry(function or(a, b) { return a || b; });
export const xor     = curry(function xor(a, b) { return (a || b) && (!!a !== !!b); });
export const assign  = curry(Object.assign, true, 2);
export { default as deep } from './modules/deep.js';
export const define  = curry(Object.defineProperties, true, 2);

/* Lists */

export { default as rest } from './modules/rest.js';
export { default as take } from './modules/take.js';
import { default as remove } from './modules/remove.js';

import * as lists   from './modules/lists/core.js';
import _ap          from './modules/lists/ap.js';
import _insert      from './modules/lists/insert.js';
import _unique      from './modules/lists/unique.js';
import _update      from './modules/lists/update.js';
import _diff        from './modules/lists/diff.js';
import _intersect   from './modules/lists/intersect.js';
import _unite       from './modules/lists/unite.js';

export { default as last }   from './modules/lists/last.js';
export { default as unique } from './modules/lists/unique.js';
export { default as by }     from './modules/by.js';

export const byAlphabet  = curry(lists.byAlphabet);

export const ap          = curry(_ap, true);
export const concat      = curry(lists.concat, true);
export const contains    = curry(lists.contains, true);
export const each        = curry(lists.each, true);
export const filter      = curry(lists.filter, true);
export const find        = curry(lists.find, true);
export const map         = curry(lists.map, true);
export const reduce      = curry(lists.reduce, true);
export const slice       = curry(lists.slice, true, 3);
export const sort        = curry(lists.sort, true);
export const insert      = curry(_insert, true);
export const update      = curry(_update, true);

export const diff        = curry(_diff, true);
export const intersect   = curry(_intersect, true);
export const unite       = curry(_unite, true);

/* Numbers */

export {
    curriedExp   as exp,
    curriedLog   as log,
    curriedMax   as max,
    curriedMin   as min,
    curriedMultiply as multiply,
    curriedPow   as pow,
    curriedRoot  as root,
    curriedSum   as sum,
    gaussian,
    toRad,
    toDeg
} from './modules/maths/core.js';

export {
    curriedGcd as gcd,
    curriedLcm as lcm,
    factorise
} from './modules/maths/ratios.js';

export { default as wrap } from './modules/maths/wrap.js';
export { default as todB } from './modules/maths/to-db.js';
export { default as toLevel } from './modules/maths/to-gain.js';
export { default as clamp } from './modules/maths/clamp.js';
export { default as mod } from './modules/maths/mod.js';
export { default as toPolar } from './modules/maths/to-polar.js';
export { default as toCartesian } from './modules/maths/to-cartesian.js';
export { default as cubicBezier } from './modules/maths/cubic-bezier.js';

import * as normalisers from './modules/normalisers.js';
import * as denormalisers from './modules/denormalisers.js';
export const normalise   = curry(choose(normalisers), false, 4);
export const denormalise = curry(choose(denormalisers), false, 4);

import _exponentialOut from './modules/maths/exponential-out.js';
export const exponentialOut = curry(_exponentialOut);



export const add = curry(function (a, b) {
    console.trace('Deprecated: module add() is now sum()');
    return a + b;
});

/* Time */

export * from './modules/date.js';
export * from './modules/time.js';

/* Test */

export { default as test } from './modules/test/test.js';
