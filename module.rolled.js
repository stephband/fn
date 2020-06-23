/**
cache(fn)
Returns a function that caches the output values of `fn(input)`
against input values in a map, such that for each input value
`fn` is only ever called once.
*/

function cache(fn) {
    var map = new Map();

    return function cache(object) {

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}

/**
curry(fn [, muteable, arity])
Returns a function that wraps `fn` and makes it partially applicable.
*/
const A     = Array.prototype;

function applyFn(fn, args) {
    return typeof fn === 'function' ? fn.apply(null, args) : fn ;
}

function curry(fn, muteable, arity) {
    arity = arity || fn.length;

    var memo = arity === 1 ?
        // Don't cache if `muteable` flag is true
        muteable ? fn : cache(fn) :

        // It's ok to always cache intermediate memos, though
        cache(function(object) {
            return curry(function() {
                var args = [object];
                args.push.apply(args, arguments);
                return fn.apply(null, args);
            }, muteable, arity - 1) ;
        }) ;

    return function partial(object) {
        return arguments.length === 0 ?
            partial :
        arguments.length === 1 ?
            memo(object) :
        arguments.length === arity ?
            fn.apply(null, arguments) :
        arguments.length > arity ?
            applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
        applyFn(memo(object), A.slice.call(arguments, 1)) ;
    };
}

//function curry(fn, muteable, arity) {
//    arity = arity || fn.length;
//    return function curried() {
//        return arguments.length >= arity ?
//            fn.apply(null, arguments) :
//            curried.bind(null, ...arguments) ;
//    };
//}

{
    const _curry = curry;

    // Feature test
	const isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();

    const setFunctionProperties = function setFunctionProperties(text, parity, fn1, fn2) {
        // Make the string representation of fn2 display parameters of fn1
        fn2.toString = function() {
            return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
        };

        // Where possible, define length so that curried functions show how
        // many arguments they are yet expecting
        if (isFunctionLengthDefineable) {
            Object.defineProperty(fn2, 'length', { value: parity });
        }

        return fn2;
    };

    // Make curried functions log a pretty version of their partials
    curry = function curry(fn, muteable, arity) {
        arity  = arity || fn.length;
        return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
    };
}


var curry$1 = curry;

/**
rest(n, array)
**/

function rest(i, object) {
    if (object.slice) { return object.slice(i); }
    if (object.rest)  { return object.rest(i); }

    var a = [];
    var n = object.length - i;
    while (n--) { a[n] = object[n + i]; }
    return a;
}

/**
choose(fn, map)
Returns a function that takes its first argument as a key and uses it
to select a function in `map` which is invoked with the remaining arguments.

Where `map` has a function `default`, that function is run when a key
is not found, otherwise unfound keys will error.

```
var fn = choose({
    'fish':  function fn1(a, b) {...},
    'chips': function fn2(a, b) {...}
});

fn('fish', a, b);   // Calls fn1(a, b)
```
*/

function choose(map) {
    return function choose(key) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, rest(1, arguments)) ;
    };
}

/**
noop()
Returns undefined.
*/

function noop() {}

/**
requestTick(fn)
Call `fn` on the next tick.
*/

const resolved = Promise.resolve();

function requestTick(fn) {
    resolved.then(fn);
    return fn;
}

// Throttle

function throttle(fn, request = requestTick) {
    let promise;
    let context;
    let args;

    return function throttle() {
        context = this;
        args    = arguments;

        if (promise) { return; }

        promise = request(() => {
            promise = undefined;
            fn.apply(context, args);
        });
    };
}

function Throttle(fn, request = requestTick, cancel = noop) {
    // If Throttle has been called without context
    if (!this) { return new Throttle(fn, request, cancel); }

    const data = this.data = {
        cancel: cancel
    };

    this.push = function throttle() {
        data.context = this;
        data.args    = arguments;

        if (data.id) { return; }

        data.id = request(() => {
            // Has throttle been stopped but for some reason cancel is
            // noop? Check the id to see.
            if (!data.id) { return; }

            data.id = undefined;
            fn.apply(data.context, data.args);
        });
    };
}

Throttle.prototype.stop = function() {
    const data = this.data;
    data.cancel(data.id);
    data.id = undefined;
    return this;
};

function Throttle$1(fn) {
	var promise, context, args;

	function fire() {
		// Remove promise
		promise = undefined;

		// Make the function
		return fn.apply(context, args);
	}

	return function throttle() {
		// Throttle requests to next tick, using the context and args
		// from the latest call to request()
		promise = promise || Promise.resolve().then(fire);
		context = this;
		args    = arguments;

		return promise;
	};
}

/**
toArray(object)
*/

function toArray(object) {
    if (object.toArray) { return object.toArray(); }

    // Speed test for array conversion:
    // https://jsperf.com/nodelist-to-array/27

    var array = [];
    var l = object.length;
    var i;

    if (typeof object.length !== 'number') { return array; }

    array.length = l;

    for (i = 0; i < l; i++) {
        array[i] = object[i];
    }

    return array;
}

const A$1 = Array.prototype;
const S = String.prototype;

/**
by(fn, a, b)
Compares `fn(a)` against `fn(b)` and returns `-1`, `0` or `1`. Useful for sorting
objects by property:

```
[{id: '2'}, {id: '1'}].sort(by(get('id')));  // [{id: '1'}, {id: '2'}]
```
**/

function by(fn, a, b) {
    const fna = fn(a);
    const fnb = fn(b);
    return fnb === fna ? 0 : fna > fnb ? 1 : -1 ;
}

/**
byAlphabet(a, b)
Compares `a` against `b` alphabetically using the current locale alphabet.
**/

function byAlphabet(a, b) {
    return S.localeCompare.call(a, b);
}

/**
each(fn, array)
Calls `fn` for each member in `array`.
**/

function each(fn, object) {
    // A stricter version of .forEach, where the callback fn
    // gets a single argument and no context.
    var l, n;

    if (typeof object.each === 'function') {
        object.each(fn);
    }
    else {
        l = object.length;
        n = -1;
        while (++n < l) { fn(object[n]); }
    }

    return object;
}

/**
map(fn, object)
Delegates to `object.map` or `Array.map` to return a new collection of mapped
values.
**/

function map(fn, object) {
    return object && object.map ? object.map(fn) : A$1.map.call(object, fn) ;
}

/**
filter(fn, object)
Delegates to `object.filter` or `Array.filter` to return a new collection of
filtered objects.
**/

function filter(fn, object) {
    return object.filter ?
        object.filter(fn) :
        A$1.filter.call(object, fn) ;
}

/**
reduce(fn, seed, object)
Delegates to `object.reduce` or `Array.reduce` to return a reduced value.
**/

function reduce(fn, seed, object) {
    return object.reduce ?
        object.reduce(fn, seed) :
        A$1.reduce.call(object, fn, seed);
}

function sort(fn, object) {
    return object.sort ? object.sort(fn) : A$1.sort.call(object, fn);
}

/**
concat(array2, array1)
Where JavaScript's Array.concat only works reliably on arrays, `concat`
will glue together any old array-like object.
**/

function concat(array2, array1) {
    // A.concat only works with arrays - it does not flatten array-like
    // objects. We need a robust concat that will glue any old thing
    // together.
    return Array.isArray(array1) ?
        // 1 is an array. Convert 2 to an array if necessary
        array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

    array1.concat ?
        // It has it's own concat method. Lets assume it's robust
        array1.concat(array2) :
    // 1 is not an array, but 2 is
    toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
}

function contains(value, object) {
    return object.includes ?
        object.includes(value) :
    object.contains ?
        object.contains(value) :
    A$1.includes ?
        A$1.includes.call(object, value) :
        A$1.indexOf.call(object, value) !== -1 ;
}

function find(fn, object) {
    return A$1.find.call(object, fn);
}


function slice(n, m, object) {
    return object.slice ?
        object.slice(n, m) :
        A$1.slice.call(object, n, m) ;
}

function print() {
    var args = arguments;
    return function print(object) {
        console.log.apply(console, concat(arguments, args));
        return object;
    };
}

/**
args()

Returns `arguments` object.

```
code(block)
```

*/

function args() { return arguments; }

/**
argument(n)

Returns a function that returns its nth argument when called.
*/

function argument(n) {
    return function argument() {
        return arguments[n];
    }
}

/**
call(fn)
Returns a function that calls `fn()` with no arguments.
*/

function call(fn) {
    return fn();
}

/**
exec(regex, fn, string)

Calls `fn` with the result of `regex.exec(string)` if that result is not null,
and returns the resulting value.
*/

function exec(regex, fn, string) {
    let data;

    // If string looks like a regex result, get rest of string
    // from latest index
    if (typeof string !== 'string' && string.input !== undefined && string.index !== undefined) {
        data = string;
        string = data.input.slice(
            string.index
            + string[0].length
            + (string.consumed || 0)
        );
    }

    // Look for tokens
    const tokens = regex.exec(string);
    if (!tokens) { return; }

    const output = fn(tokens);

    // If we have a parent tokens object update its consumed count
    if (data) {
        data.consumed = (data.consumed || 0)
            + tokens.index
            + tokens[0].length
            + (tokens.consumed || 0) ;
    }

    return output;
}

var exec$1 = curry$1(exec, true);

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot parse invalid string "' + string + '"');
}

function reduce$1(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the optional close fn
    return reducers.close ?
        reducers.close(acc, tokens) :
        acc ;
}

/**
capture(regex, reducers, accumulator, string)
Parse `string` with `regex`, calling functions in `reducers` to modify
and return `accumulator`.

Reducers is an object of functions keyed by the index of their capturing
group in the regexp result (`0` corresponding to the entire regex match,
the first capturing group being at index `1`). Reducer functions are
called in capture order for all capturing groups that captured something.
Reducers may also define the function 'close', which is called at the end
of every capture. All reducer functions are passed the paremeters
`(accumulator, tokens)`, where `tokens` is the regexp result, and are expected
to return a value that is passed as an accumulator to the next reducer function.

Reducers may also define a function `'catch'`, which is called when a match
has not been made (where `'catch'` is not defined an error is thrown).

```js
const parseValue = capture(/^\s*(-?\d*\.?\d+)(\w+)?\s*$/, {
    // Create a new accumulator object each call
    0: () => ({}),

    1: (acc, tokens) => {
        acc.number = parseFloat(tokens[1]);
        return acc;
    },

    2: (acc, tokens) => {
        acc.unit = tokens[2];
        return acc;
    }
}, null);

const value = parseValue('36rem');    // { number: 36, unit: 'rem' }
```
*/

function capture(regex, reducers, acc, string) {
    const output = exec(regex, (tokens) => reduce$1(reducers, acc, tokens), string);

    // If tokens is undefined exec has failed apply regex to string
    return output === undefined ?
        // If there is a catch function, call it, otherwise error out
        reducers.catch ?
            reducers.catch(acc, string) :
            error(regex, reducers, string) :

        // Return the accumulator
        output ;
}

var capture$1 = curry$1(capture, true);

/**
choke(fn, time)

Returns a function that waits for `time` seconds without being invoked
before calling `fn` using the context and arguments from the latest
invocation.
*/

function choke(fn, time) {
    var timer, context, args;
    var cue = function cue() {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(update, (time || 0) * 1000);
    };

    function update() {
        timer = false;
        fn.apply(context, args);
    }

    function cancel() {
        // Don't permit further changes to be queued
        cue = noop;

        // If there is an update queued apply it now
        if (timer) { clearTimeout(timer); }
    }

    function wait() {
        // Store the latest context and arguments
        context = this;
        args = arguments;

        // Cue the update
        cue();
    }

    wait.cancel = cancel;
    return wait;
}

// Choke or wait? A simpler implementation without cancel(), I leave this here for reference...
//	function choke(seconds, fn) {
//		var timeout;
//
//		function update(context, args) {
//			fn.apply(context, args);
//		}
//
//		return function choke() {
//			clearTimeout(timeout);
//			timeout = setTimeout(update, seconds * 1000, this, arguments);
//		};
//	}

/**
compose(fn2, fn1)
Calls `fn1`, passes the result to `fn2`, and returns that result.
*/

function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}

function deprecate(fn, message) {
    // Recall any function and log a depreciation warning
    return function deprecate() {
        console.warn('Deprecation warning: ' + message);
        return fn.apply(this, arguments);
    };
}

function equals(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return true; }

    // If either of the values is null, or not an object, we already know
    // they're not equal so get out of here
    if (a === null ||
        b === null ||
        typeof a !== 'object' ||
        typeof b !== 'object') {
        return false;
    }

    // Compare their enumerable keys
    const akeys = Object.keys(a);
    let n = akeys.length;

    while (n--) {
        // Has the property been set to undefined on a?
        if (a[akeys[n]] === undefined) {
            // We don't want to test if it is an own property of b, as
            // undefined represents an absence of value
            if (b[akeys[n]] === undefined) {
                return true;
            }
        }
        else {
            //
            if (b.hasOwnProperty(akeys[n]) && !equals(a[akeys[n]], b[akeys[n]])) {
                return false;
            }
        }
    }

    return true;
}

var equals$1 = curry$1(equals, true);

function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];
}

var get$1 = curry$1(get, true);

var rpath  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

function findByProperty(key, value, array) {
    var l = array.length;
    var n = -1;

    while (++n < l) {
        if (array[n][key] === value) {
            return array[n];
        }
    }
}


// Get path

function getRegexPathThing(regex, path, object, fn) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key      = tokens[1];
    var property = tokens[3] ?
        findByProperty(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5]),
        object) :
        object[key] ;

    return fn(regex, path, property);
}

function getRegexPath(regex, path, object) {
    return regex.lastIndex === path.length ?
        object :
    !(object && typeof object === 'object') ?
        undefined :
    getRegexPathThing(regex, path, object, getRegexPath) ;
}

function getPath(path, object) {
    rpath.lastIndex = 0;
    return getRegexPath(rpath, path, object) ;
}

var getPath$1 = curry$1(getPath, true);

/**
has(key, value, object)
Returns `true` if `object[key]` is strictly equal to `value`.
*/

function has(key, value, object) {
    return object[key] === value;
}

var has$1 = curry$1(has, true);

/**
id(value)
Returns `value`.
*/

function id(value) { return value; }

/**
invoke(name, parameters, object)
Invokes `object.name()` with `parameters` as arguments. For example:

```
models.forEach(invoke('save', [version]));
```
*/

function invoke(name, values, object) {
    return object[name].apply(object, values);
}

var invoke$1 = curry$1(invoke, true);

const is = Object.is || function is(a, b) { return a === b; };

var is$1 = curry$1(is, true);

/**
isDefined(value)
Check for value – where `value` is `undefined`, `NaN` or `null`, returns
`false`, otherwise `true`.
*/


function isDefined(value) {
    // !!value is a fast out for non-zero numbers, non-empty strings
    // and other objects, the rest checks for 0, '', etc.
    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
}

function latest(source) {
    var value = source.shift();
    return value === undefined ? arguments[1] : latest(source, value) ;
}

/**
matches(selector, object)
Where `selector` is an object containing properties to be compared against
properties of `object`. If they are all strictly equal, returns `true`,
otherwise `false`.

```
const vegeFoods = menu.filter(matches({ vegetarian: true }));
```
*/

function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

var matches$1 = curry$1(matches, true);

/**
not(value)
Returns `!value`.
*/

function not(n) { return !n; }

const done     = { done: true };
const iterator = { next: () => done };

var nothing = Object.freeze({
    // Standard array methods
    shift: noop,
    push:  noop,

    // Stream methods
    start: noop,
    stop:  noop,

    // Make it look like an empty array
    length: 0,

    // Make it an iterable with nothing in it
    [Symbol.iterator]: () => iterator
});

function now() {
    // Return time in seconds
    return +new Date() / 1000;
}

/**
once(fn)
Returns a function that calls `fn` the first time it is invoked,
and then becomes a noop.
*/

function once(fn) {
    return function once() {
        var value = fn.apply(this, arguments);
        fn = noop;
        return value;
    };
}

/**
overload(fn, map)

Returns a function that calls a function at the property of `object` that
matches the result of calling `fn` with all arguments.</p>

```
var fn = overload(toType, {
    string: function a(name, n) {...},
    number: function b(n, m) {...}
});

fn('pie', 4); // Returns a('pie', 4)
fn(1, 2);     // Returns b(1, 2)
```
*/


function overload(fn, map) {
    return typeof map.get === 'function' ?
        function overload() {
            var key = fn.apply(null, arguments);
            return map.get(key).apply(this, arguments);
        } :
        function overload() {
            const key     = fn.apply(null, arguments);
            const handler = (map[key] || map.default);
            if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
            return handler.apply(this, arguments);
        } ;
}

/**
parseInt(string)
Parse to integer without having to worry about the radix parameter,
making it suitable, for example, to use in `array.map(parseInt)`.
*/

function parseInteger(object) {
    return object === undefined ?
        undefined :
        parseInt(object, 10);
}

function apply(value, fn) {
    return fn(value);
}

/**
pipe(fn1, fn2, ...)
Returns a function that calls `fn1`, `fn2`, etc., passing the result of
calling one function to the next and returning the the last result.
*/

const A$2 = Array.prototype;

function pipe() {
    const fns = arguments;
    return fns.length ?
        (value) => A$2.reduce.call(fns, apply, value) :
        id ;
}

const $private = Symbol('private');

function privates(object) {
    return object[$private] ?
        object[$private] :
        Object.defineProperty(object, $private, {
            value: {}
        })[$private] ;
}

/**
self()
Returns `this`.
*/

function self() { return this; }

/**
set(key, object, value)

```
// Set `input.value` whenever a value is pushed into a stream:
stream.scan(set('value'), input);
```
*/

function set(key, object, value) {
    return typeof object.set === "function" ?
        object.set(key, value) :
        (object[key] = value) ;
}

var set$1 = curry$1(set, true);

var rpath$1  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

function findByProperty$1(key, value, array) {
    var l = array.length;
    var n = -1;

    while (++n < l) {
        if (array[n][key] === value) {
            return array[n];
        }
    }
}

function setRegexPath(regex, path, object, thing) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key = tokens[1];

    if (regex.lastIndex === path.length) {
        // Cannot set to [prop=value] selector
        if (tokens[3]) {
            throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
        }

        return object[key] = thing;
    }

    var value = tokens[3] ?
        findByProperty$1(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5])
        ) :
        object[key] ;

    if (!(value && typeof value === 'object')) {
        value = {};

        if (tokens[3]) {
            if (object.push) {
                value[key] = tokens[2] ?
                    tokens[3] :
                    parseFloat(tokens[3]) ;

                object.push(value);
            }
            else {
                throw new Error('Not supported');
            }
        }

        set(key, object, value);
    }

    return setRegexPath(regex, path, value, thing);
}

function setPath(path, object, value) {
    rpath$1.lastIndex = 0;
    return setRegexPath(rpath$1, path, object, value);
}

var setPath$1 = curry$1(setPath, true);

/**
toClass(object)
*/

const O = Object.prototype;

function toClass(object) {
    return O.toString.apply(object).slice(8, -1);
}

/**
toFixed(number)
*/

const N     = Number.prototype;
const isNaN = Number.isNaN;

function toFixed(n, value) {
    if (isNaN(value)) {
        return '';
        // throw new Error('Fn.toFixed does not accept NaN.');
    }

    return N.toFixed.call(value, n);
}

var toFixed$1 = curry$1(toFixed, true);

/**
toString(object)
Returns `object.toString()`.
*/

function toString(object) {
	return object.toString();
}

/**
toType(object)
Returns `typeof object`.
*/

function toType(object) {
    return typeof object;
}

/**
weakCache(fn)
Returns a function that caches the return values of `fn()`
against input values in a WeakMap, such that for each input value
`fn` is only ever called once.
*/

function weakCache(fn) {
    var map = new WeakMap();

    return function weakCache(object) {

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}

/**
prepend(string1, string2)
Returns `str1 + str2`.
**/

function prepend(string1, string2) {
    return '' + string1 + string2;
}

var prepend$1 = curry$1(prepend);

const assign = Object.assign;

function isDone(source) {
    return source.length === 0 || source.status === 'done' ;
}

function create(object, fn) {
    var functor = Object.create(object);
    functor.shift = fn;
    return functor;
}

function arrayReducer(array, value) {
    array.push(value);
    return array;
}

function shiftTap(shift, fn) {
    return function tap() {
        var value = shift();
        value !== undefined && fn(value);
        return value;
    };
}

function sortedSplice(array, fn, value) {
    // Splices value into array at position determined by result of fn,
    // where result is either in the range [-1, 0, 1] or [true, false]
    var n = sortIndex(array, function(n) {
        return fn(value, n);
    });
    array.splice(n, 0, value);
}

function sortIndex(array, fn) {
    var l = array.length;
    var n = l + l % 2;
    var i = 0;

    while ((n = Math.floor(n / 2)) && (i + n <= l)) {
        if (fn(array[i + n - 1]) >= 0) {
            i += n;
            n += n % 2;
        }
    }

    return i;
}

/** Properties */

/**
.status
Reflects the running status of the stream. When all values have been consumed
status is `'done'`.
*/

function Fn(fn) {
    // Accept constructor without `new`
    if (!this || !Fn.prototype.isPrototypeOf(this)) {
        return new Fn(fn);
    }

    var source = this;

    if (!fn) {
        source.status = 'done';
        return;
    }

    var value = fn();

    if (value === undefined) {
        source.status = 'done';
        return;
    }

    this.shift = function shift() {
        if (source.status === 'done') { return; }

        var v = value;

        // Where the next value is undefined mark the functor as done
        value = fn();
        if (value === undefined) {
            source.status = 'done';
        }

        return v;
    };
}


assign(Fn, {

    // Constructors

    of: function() { return Fn.from(arguments); },

    from: function(object) {
        var i;

        // object is an array or array-like object. Iterate over it without
        // mutating it.
        if (typeof object.length === 'number') {
            i = -1;

            return new Fn(function shiftArray() {
                // Ignore undefined holes in arrays
                return ++i >= object.length ?
                    undefined :
                object[i] === undefined ?
                    shiftArray() :
                    object[i] ;
            });
        }

        // object is an object with a shift function
        if (typeof object.shift === "function" && object.length === undefined) {
            return new Fn(function shiftObject() {
                return object.shift();
            });
        }

        // object is an iterator
        if (typeof object.next === "function") {
            return new Fn(function shiftIterator() {
                var result = object.next();

                // Ignore undefined holes in iterator results
                return result.done ?
                    result.value :
                result.value === undefined ?
                    shiftIterator() :
                    result.value ;
            });
        }

        throw new Error('Fn: from(object) object is not a list of a known kind (array, functor, stream, iterator).')
    }
});


function scanChunks(data, value) {
    data.accumulator.push(value);
    ++data.count;

    if (data.count % data.n === 0) {
        data.value = data.accumulator;
        data.accumulator = [];
    }
    else {
        data.value = undefined;
    }

    return data;
}

assign(Fn.prototype, {
    shift: noop,

    // Input

    of: function() {
        // Delegate to the constructor's .of()
        return this.constructor.of.apply(this.constructor, arguments);
    },

    // Transform

    ap: function(object) {
        var stream = this;

        return create(this, function ap() {
            var fn = stream.shift();
            return fn && object.map(fn) ;
        });
    },

    /**
    .unshift(...values)
    Creates a buffer of values at the end of the stream that are read first.
    */

    unshift: function() {
        var source = this;
        var buffer = toArray(arguments);

        return create(this, function() {
            return (buffer.length ? buffer : source).shift() ;
        });
    },

    catch: function(fn) {
        var source = this;

        return create(this, function() {
            try {
                return source.shift();
            }
            catch(e) {
                return fn(e);
            }
        });
    },

    syphon: function(fn) {
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }

            var value;

            while ((value = shift()) !== undefined && fn(value)) {
                buffer2.push(value);
            }

            return value;
        };

        return create(this, function filter() {
            if (buffer2.length) { return buffer2.shift(); }

            var value;

            while ((value = shift()) !== undefined && !fn(value)) {
                buffer1.push(value);
            }

            return value;
        });
    },

    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];
        var doneFlag = false;

        // Messy. But it works. Just.

        this.shift = function() {
            var value;

            if (buffer1.length) {
                value = buffer1.shift();

                if (!buffer1.length && doneFlag) {
                    source.status = 'done';
                }

                return value;
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                }

                if (value !== undefined) {
                    buffer2.push(value);
                }

                return value;
            }
        };

        var clone = new Fn(function shiftClone() {
            var value;

            if (buffer2.length) {
                return buffer2.shift();
                //if (!buffer2.length && doneFlag) {
                //	clone.status = 'done';
                //}
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                    source.status = undefined;
                }

                if (value !== undefined) {
                    buffer1.push(value);
                }

                return value;
            }
        });

        return clone;
    },

    concat: function() {
        var sources = toArray(arguments);
        var source  = this;

        var stream  = create(this, function concat() {
            if (source === undefined) {
                stream.status = 'done';
                return;
            }

            if (isDone(source)) {
                source = sources.shift();
                return concat();
            }

            var value = source.shift();

            stream.status = sources.length === 0 && isDone(source) ?
                'done' : undefined ;

            return value;
        });

        return stream;
    },

    /**
    .dedup()

    Filters out consecutive equal values.
    */

    dedup: function() {
        var v;
        return this.filter(function(value) {
            var old = v;
            v = value;
            return old !== value;
        });
    },

    /**
    .filter(fn)

    Filter values according to the truthiness of `fn(value)`.
    */

    filter: function(fn) {
        var source = this;

        return create(this, function filter() {
            var value;
            while ((value = source.shift()) !== undefined && !fn(value));
            return value;
        });
    },

    /**
    .flat()
    Flattens a list of lists into a single list.
    */

    join: function() {
        console.trace('Fn.join() is now Fn.flat() to mirror name of new Array method');
        return this.flat();
    },

    flat: function() {
        var source = this;
        var buffer = nothing;

        return create(this, function flat() {
            var value = buffer.shift();
            if (value !== undefined) { return value; }
            // Support array buffers and stream buffers
            //if (buffer.length === 0 || buffer.status === 'done') {
                buffer = source.shift();
                if (buffer !== undefined) { return flat(); }
                buffer = nothing;
            //}
        });
    },

    /**
    .flatMap()
    Maps values to lists – `fn(value)` must return an array, stream
    or other type with a `.shift()` method – and flattens those lists into a
    single stream.
    */

    flatMap: function(fn) {
        return this.map(fn).flat();
    },

    chain: function(fn) {
        console.trace('Stream.chain() is now Stream.flatMap()');
        return this.map(fn).flat();
    },

    /**
    .latest()

    When the stream has a values buffered, passes the last value
    in the buffer.
    */

    latest: function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    },

    /**
    .map(fn)
    Maps values to the result of `fn(value)`.
    */

    map: function(fn) {
        return create(this, compose(function map(object) {
            return object === undefined ? undefined : fn(object) ;
        }, this.shift));
    },

    ///**
    //.chunk(n)
    //Batches values into arrays of length `n`.
    //**/

    chunk: function(n) {
        return this
        .scan(scanChunks, {
            n: n,
            count: 0,
            accumulator: []
        })
        .map(function(accumulator) {
            return accumulator.value;
        });
    },

    partition: function(fn) {
        var source = this;
        var buffer = [];
        var streams = new Map();

        fn = fn || Fn.id;

        function createPart(key, value) {
            // Todo: Nope, no pull
            var stream = Stream.of().on('pull', shiftPull);
            stream.key = key;
            streams.set(key, stream);
            return stream;
        }

        function shiftPull(type, pullStream) {
            var value  = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === pullStream) { return value; }

            if (stream === undefined) {
                stream = createPart(key);
                buffer.push(stream);
            }

            stream.push(value);
            return shiftPull(type, pullStream);
        }

        return create(this, function shiftStream() {
            if (buffer.length) { return buffer.shift(); }

            var value = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === undefined) {
                stream = createPart(key);
                stream.push(value);
                return stream;
            }

            stream.push(value);
            return shiftStream();
        });
    },

    fold: function reduce(fn, seed) {
        return this.scan(fn, seed).latest().shift();
    },

    /**
    .scan(fn, seed)

    Calls `fn(accumulator, value)` and emits `accumulator` for each value
    in the stream.
    */

    scan: function scan(fn, accumulator) {
        return this.map(function scan(value) {
            var acc = fn(accumulator, value);
            accumulator = acc;
            return accumulator;
        });
    },

    /**
    .take(n)

    Filters the stream to the first `n` values.
    */

    take: function(n) {
        var source = this;
        var i = 0;

        return create(this, function take() {
            var value;

            if (i < n) {
                value = source.shift();
                // Only increment i where an actual value has been shifted
                if (value === undefined) { return; }
                if (++i === n) {
                    this.push = noop;
                    this.stop = noop;
                    this.status = 'done';
                }
                return value;
            }
        });
    },

    sort: function(fn) {
        fn = fn || Fn.byGreater ;

        var source = this;
        var buffer = [];

        return create(this, function sort() {
            var value;

            while((value = source.shift()) !== undefined) {
                sortedSplice(buffer, fn, value);
            }

            return buffer.shift();
        });
    },

    split: function(fn) {
        var source = this;
        var buffer = [];

        return create(this, function split() {
            var value = source.shift();
            var temp;

            if (value === undefined) {
                if (buffer.length) {
                    temp = buffer;
                    buffer = [];
                    return temp;
                }

                return;
            }

            if (fn(value)) {
                temp = buffer;
                buffer = [value];
                return temp.length ? temp : split() ;
            }

            buffer.push(value);
            return split();
        });
    },

    /**
    .rest(n)

    Filters the stream to all values after the `n`th value.
    */

    rest: function(i) {
        var source = this;

        return create(this, function rest() {
            while (i-- > 0) { source.shift(); }
            return source.shift();
        });
    },

    /**
    .unique()

    Filters the stream to remove any value already emitted.
    */

    unique: function() {
        var source = this;
        var values = [];

        return create(this, function unique() {
            var value = source.shift();

            return value === undefined ? undefined :
                values.indexOf(value) === -1 ? (values.push(value), value) :
                unique() ;
        });
    },

    // Consumers

    each: function(fn) {
        var value;

        while ((value = this.shift()) !== undefined) {
            fn.call(this, value);
        }

        return this;
    },

    find: function(fn) {
        return this
        .filter(fn)
        .first()
        .shift();
    },

    next: function() {
        return {
            value: this.shift(),
            done:  this.status
        };
    },

    /**
    .pipe(stream)

    Pipes the current stream into `stream`.
    */

    pipe: function(stream) {
        this.each(stream.push);
        return stream;
    },

    /**
    .tap(fn)

    Calls `fn(value)` for each value in the stream without modifying
    the stream. Note that values are only tapped when there is a
    consumer attached to the end of the stream to suck them through.
    */

    tap: function(fn) {
        // Overwrite shift to copy values to tap fn
        this.shift = shiftTap(this.shift, fn);
        return this;
    },

    toJSON: function() {
        const array = [];
        this.scan(arrayReducer, array).each(noop);
        return array;
    },

    toString: function() {
        return this.reduce(prepend$1, '');
    }
});

Fn.prototype.toArray = Fn.prototype.toJSON;

// Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
//
// equals: 'fantasy-land/equals',
// lte: 'fantasy-land/lte',
// concat: 'fantasy-land/concat',
// empty: 'fantasy-land/empty',
// map: 'fantasy-land/map',
// contramap: 'fantasy-land/contramap',
// ap: 'fantasy-land/ap',
// of: 'fantasy-land/of',
// alt: 'fantasy-land/alt',
// zero: 'fantasy-land/zero',
// reduce: 'fantasy-land/reduce',
// traverse: 'fantasy-land/traverse',
// chain: 'fantasy-land/chain',
// chainRec: 'fantasy-land/chainRec',
// extend: 'fantasy-land/extend',
// extract: 'fantasy-land/extract',
// bimap: 'fantasy-land/bimap',
// promap: 'fantasy-land/promap'


if (window.Symbol) {
    // A functor is it's own iterator
    Fn.prototype[Symbol.iterator] = function() {
        return this;
    };
}

/**
Timer(duration, getTime)

Create an object with a request/cancel pair of functions that
fires request(fn) callbacks at a given duration.
*/

function Timer(duration, getTime) {
    if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

    // Optional second argument is a function that returns
    // current time (in seconds)
    getTime = getTime || now;

    var fns = [];
    var id;
    var t0  = -Infinity;

    function frame() {
        var n = fns.length;

        id = undefined;
        t0 = getTime();

        while (n--) {
            fns.shift()(t0);
        }
    }

    return {
        now: getTime,

        request: function(fn) {
            if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

            // Add fn to queue
            fns.push(fn);

            // If the timer is cued do nothing
            if (id) { return; }

            var t1 = getTime();

            // Set the timer and return something truthy
            if (t0 + duration > t1) {
                id = setTimeout(frame, (t0 + duration - t1) * 1000);
            }
            else {
                requestTick(frame) ;
            }

            // Use the fn reference as the request id, because why not
            return fn;
        },

        cancel: function(fn) {
            var i = fns.indexOf(fn);
            if (i === -1) { return; }

            fns.splice(i, 1);

            if (!fns.length) {
                clearTimeout(id);
                id = undefined;
            }
        }
    };
}

var DEBUG     = window.DEBUG !== false;
var assign$1    = Object.assign;


function isDone$1(stream) {
    return stream.status === 'done';
}

function notify(object) {
    var events = privates(object).events;
    if (!events) { return; }

    var n = -1;
    var l = events.length;
    var value;

    while (++n < l) {
        value = events[n](object);
        if (value !== undefined) { return value; }
    }
}

function done$1(stream, privates) {
    stream.status = 'done';
    privates.source = nothing;
    privates.resolve();
}

function createSource(stream, privates, Source, buffer) {
    buffer = buffer === undefined ? [] :
        buffer.shift ? buffer :
        Array.from(buffer) ;

    // Flag to tell us whether we are using an internal buffer - which
    // depends on the existence of source.shift
    var buffered = true;
    var initialised = false;

    function push() {
        // Detect that buffer exists and is not an arguments object, if so
        // we push to it
        buffered && buffer.push.apply(buffer, arguments);
        initialised && notify(stream);
    }

    function stop(n) {
        // If stop count is not given, use buffer length (if buffer exists and
        // is not arguments object) by default
        n = n !== undefined ? n :
            buffered ? buffer.length :
            0 ;

        // Neuter events
        delete privates.events;

        // If no n, shut the stream down
        if (!n) {
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
            done$1(stream, privates);
        }

        // Schedule shutdown of stream after n values
        else {
            privates.source = new StopSource(stream, privates.source, privates, n, done$1);
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
        }
    }

    const source = Source.prototype ?
        // Source is constructable
        new Source(push, stop) :
        // Source is an arrow function
        Source(push, stop) ;

    initialised = true;

    // Where source has .shift() override the internal buffer
    if (source.shift) {
        buffered = false;
        buffer = undefined;
    }

    // Otherwise give it a .shift() for the internal buffer
    else {
        source.shift = function () {
            return buffer.shift();
        };
    }

    // Gaurantee that source has a .stop() method
    if (!source.stop) {
        source.stop = noop;
    }

    return (privates.source = source);
}

function shiftBuffer(shift, state, one, two, buffer) {
    if (buffer.length && state.buffered === one) {
        return buffer.shift();
    }

    const value = shift();
    if (value === undefined) { return; }

    buffer.push(value);
    state.buffered = two;
    return value;
}

function flat(output, input) {
    input.pipe ?
        // Input is a stream
        input.pipe(output) :
        // Input is an array-like
        output.push.apply(output, input) ;

    return output;
}

// StartSource

function StartSource(stream, privates, Source, buffer) {
    this.stream   = stream;
    this.privates = privates;
    this.Source   = Source;
    this.buffer   = buffer;
}

assign$1(StartSource.prototype, {
    create: function() {
        return createSource(this.stream, this.privates, this.Source, this.buffer);
    },

    shift: function shift() {
        return this.create().shift();
    },

    push: function push() {
        const source = this.create();
        if (!source.push) { throw new Error('Attempt to .push() to unpushable stream'); }
        source.push.apply(source, arguments);
    },

    start: function start() {
        const source = this.create();
        if (!source.start) { throw new Error('Attempt to .start() unstartable stream'); }
        source.start.apply(source, arguments);
    },

    stop: function done() {
        const source = this.create();

        if (!source.stop) {
            done(this.stream, this.privates);
        }

        source.stop.apply(source, arguments);
    }
});


// StopSource

function StopSource(stream, source, privates, n, done) {
    this.stream   = stream;
    this.source   = source;
    this.privates = privates;
    this.n        = n;
    this.done     = done;
}

assign$1(StopSource.prototype, nothing, {
    shift: function() {
        const value = this.source.shift();
        if (--this.n < 1) { this.done(this.stream, this.privates); }
        return value;
    },

    start: function() {
        throw new Error('Cannot .start() stopped stream');
    },

    push: function() {
        throw new Error('Cannot .push() to stopped stream');
    }
});


/** Construct */

/**
Stream(fn)

Construct a new stream. `fn(push, stop)` is invoked when the stream is started,
and it must return a 'producer' – an object with methods to control the flow of
data:

```js
const stream = Stream(function(push, stop) {
    return {
        push:  fn,  // Optional. Makes the stream pushable.
        start: fn,  // Optional. Makes the stream extarnally startable.
        stop:  fn   // Optional. Makes the stream externally stoppable.
        shift: fn,  // Optional. Overrides the stream's internal buffer.
    };
});
```
*/

function Stream$1(Source, buffer) {
    if (DEBUG) {
        if (arguments.length > 2) {
            throw new Error('Stream(setup, buffer) takes 2 arguments. Recieved ' + arguments.length + '.');
        }
    }

    // Enable construction without the `new` keyword
    if (!Stream$1.prototype.isPrototypeOf(this)) {
        return new Stream$1(Source, buffer);
    }

    // Privates

    const privates$1 = privates(this);
    privates$1.stream  = this;
    privates$1.events  = [];
    privates$1.resolve = noop;
    privates$1.source  = new StartSource(this, privates$1, Source, buffer);

    // Methods

    this.shift = function shift() {
        return privates$1.source.shift();
    };

    // Keep it as an instance method for just now
    this.push = function push() {
        const source = privates$1.source;
        source.push.apply(source, arguments);
        return this;
    };
}

Stream$1.prototype = assign$1(Object.create(Fn.prototype), {
    constructor: Stream$1,

    /** Write */

    /**
    .push(value)
    Pushes a `value` (or multiple values) into the head of a writeable stream.
    If the stream is not writeable, it does not have a `.push()` method.
    */

    /** Map */

    //.chunk(n)
    //Batches values into arrays of length `n`.

    /**
    .flat()
    Flattens a stream of streams or arrays into a single stream.
    */

    flat: function() {
        const output = this.constructor.of();

        this
        .scan(flat, output)
        .each(noop);

        return output;
    },

    /**
    .flatMap(fn)
    Maps values to lists – `fn(value)` must return an array, functor, stream
    (or any other duck with a `.shift()` method) and flattens those lists into a
    single stream.
    */

    /**
    .map(fn)
    Maps values to the result of `fn(value)`.
    */

    /**
    .merge(stream)
    Merges this stream with `stream`, which may be an array, array-like
    or functor.
    */

    merge: function merge() {
        var sources = toArray(arguments);
        sources.unshift(this);
        return Stream$1.Merge.apply(null, sources);
    },

    /**
    .scan(fn, seed)
    Calls `fn(accumulator, value)` and emits `accumulator` for each value
    in the stream.
    */


    /** Filter */

    /**
    .dedup()
    Filters out consecutive equal values.
    */

    /**
    .filter(fn)
    Filter values according to the truthiness of `fn(value)`.
    */

    /**
    .latest()
    When the stream has a values buffered, passes the last value
    in the buffer.
    */

    /**
    .rest(n)
    Filters the stream to the `n`th value and above.
    */

    /**
    .take(n)
    Filters the stream to the first `n` values.
    */

    //.clock(timer)
    //Emits values at the framerate of `timer`, one-per-frame. No values
    //are discarded.
    //
    //clock: function clock(timer) {
    //    return this.pipe(Stream.clock(timer));
    //},

    /**
    .throttle(time)
    Throttles values such that the latest value is emitted every `time` seconds.
    Other values are discarded. The parameter `time` may also be a timer options
    object, an object with `{ request, cancel, now }` functions,
    allowing the creation of, say, and animation frame throttle.
    */

    throttle: function throttle(timer) {
        return this.pipe(Stream$1.throttle(timer));
    },

    /**
    .wait(time)
    Emits the latest value only after `time` seconds of inactivity.
    Other values are discarded.
    */

    wait: function wait(time) {
        return this.pipe(Stream$1.Choke(time));
    },

    /**
    .combine(fn, stream)
    Combines the latest values from this stream and `stream` via the combinator
    `fn` any time a new value is emitted by either stream.
    */

    combine: function(fn, stream) {
        const streams = Array.from(arguments);
        streams[0] = this;
        return CombineStream(fn, streams);
    },


    /** Read */

    /**
    .clone()
    Creates a read-only copy of the stream.
    */

    clone: function clone() {
        const source = this;
        const shift  = this.shift.bind(this);
        const buffer = [];

        const state = {
            // Flag telling us which stream has been buffered,
            // source (1) or copy (2)
            buffered: 1
        };

        this.shift = function() {
            return shiftBuffer(shift, state, 1, 2, buffer);
        };

        return new Stream$1(function(notify, stop) {
            source.on(notify);
            source.done(stop);

            return {
                shift: function() {
                    return shiftBuffer(shift, state, 2, 1, buffer);
                },

                stop: function() {
                    stop(0);
                }
            }
        });
    },

    /**
    .each(fn)
    Thirstilly consumes the stream, calling `fn(value)` whenever
    a value is available.
    */

    each: function each(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        // Delegate to Fn#each().
        return this.on(() => Fn.prototype.each.apply(source, args));
    },

    /**
    .last(fn)
    Consumes the stream when stopped, calling `fn(value)` with the
    last value read from the stream.
    */

    last: function last(fn) {
        const privates$1 = privates(this);
        privates$1.stops = privates$1.stops || [];
        const value = this.latest().shift();
        value !== undefined && privates$1.stops.push(() => fn(value));
        return this;
    },

    /**
    .fold(fn, accumulator)
    Consumes the stream when stopped, calling `fn(accumulator, value)`
    for each value in the stream. Returns a promise.
    */

    fold: function fold(fn, accumulator) {
        // Fold to promise
        return new Promise((resolve, reject) => {
            this
            .scan(fn, accumulator)
            .last(resolve);
        });
    },

    //.reduce(fn, accumulator)
    //Consumes the stream when stopped, calling `fn(accumulator, value)`
    //for each value in the stream. Returns a promise that resolves to
    //the last value returned by `fn(accumulator, value)`.

    reduce: function reduce(fn, accumulator) {
        // Support array.reduce semantics with optional seed
        return accumulator ?
            this.fold(fn, accumulator) :
            this.fold((acc, value) => (acc === undefined ? value : fn(acc, value)), this.shift()) ;
    },

    /**
    .shift()
    Reads a value from the stream. If no values are in the stream, returns
    `undefined`. If this is the last value in the stream, `stream.status`
    is `'done'`.
    */

    /** Lifecycle */

    /**
    .done(fn)
    Calls `fn()` after the stream is stopped and all values have been drained.
    */

    done: function done(fn) {
        const privates$1 = privates(this);
        const promise = privates$1.promise || (
            privates$1.promise = this.status === 'done' ?
                Promise.resolve() :
                new Promise((resolve, reject) => assign$1(privates$1, { resolve, reject }))
        );

        promise.then(fn);
        return this;
    },

    /**
    .start()
    If the stream's producer is startable, starts the stream.
    */

    start: function start() {
        const source = privates(this).source;
        source.start.apply(source, arguments);
        return this;
    },

    /**
    .stop()
    Stops the stream. No more values can be pushed to the stream and any
    consumers added will do nothing. However, depending on the stream's source
    the stream may yet drain any buffered values into an existing consumer
    before entering `'done'` state. Once in `'done'` state a stream is
    entirely inert.
    */

    stop: function stop() {
        const source = privates(this).source;
        source.stop.apply(source, arguments);
        return this;
    },

    on: function on(fn) {
        if (DEBUG && typeof fn === 'string') {
            throw new Error('stream.on(fn) no longer takes type');
        }

        var events = privates(this).events;
        if (!events) { return this; }

        events.push(fn);
        return this;
    },

    off: function off(fn) {
        if (DEBUG && typeof fn === 'string') {
            throw new Error('stream.off(fn) no longer takes type');
        }

        var events = privates(this).events;
        if (!events) { return this; }

        // Remove all handlers
        if (!fn) {
            events.length = 0;
            return this;
        }

        // Remove handler fn for type
        var n = events.length;
        while (n--) {
            if (events[n] === fn) { events.splice(n, 1); }
        }

        return this;
    },

    toPush: function() {
        const stream = this;
        const privates$1 = privates(this);
        return privates$1.input || (privates$1.input = function() {
            stream.push.apply(stream, arguments);
        });
    }
});


/**
Stream.from(values)
Returns a writeable stream that consumes the array or array-like `values` as
its buffer.
*/

function Pushable(push, stop) {
    this.push = push;
    this.stop = stop;
}

Stream$1.from = function(values) {
    return new Stream$1(Pushable, values);
};


/**
Stream.fromPromise(promise)
Returns a stream that uses the given promise as its source. When the promise
resolves the stream is given its value and stopped. If the promise errors
the stream is stopped without value. This stream is not pushable, but may
be stopped before the promise resolves.
*/

Stream$1.fromPromise = function(promise) {
    return new Stream$1(function(push, stop) {
        promise.then(push);
        promise.finally(stop);
        return { stop };
    });
};






// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign$1(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify();
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify();
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});


/**
Stream.fromTimer(timer)
Create a stream from a `timer` object. A `timer` is an object
with the properties:

```
{
    request:     fn(fn), calls fn on the next frame, returns an id
    cancel:      fn(id), cancels request with id
    now:         fn(), returns the time
    currentTime: time at the start of the latest frame
}
```

Here is how a stream of animation frames may be created:

```
const frames = Stream.fromTimer({
    request: window.requestAnimationFrame,
    cancel: window.cancelAnimationFrame,
    now: () => window.performance.now()
});
```

This stream is not pushable.
*/

Stream$1.fromTimer = function TimeStream(timer) {
    return new Stream$1(function(push, stop) {
        return new TimeSource(push, stop, timer);
    });
};


/**
Stream.of(...values)
Returns a stream that consumes arguments as a buffer. The stream is pushable.
*/

Stream$1.of = function() {
    return Stream$1.from(arguments);
};


// CombineStream

function CombineProducer(push, stop, fn, streams) {
    const values = {
        length: streams.length,
        count: 0,
        doneCount: 0
    };

    function done() {
        ++values.doneCount;

        // Are all the source streams finished?
        if (values.doneCount === values.length) {
            // Stop the stream
            stop();
        }
    }

    streams.forEach(function(stream, i) {
        stream
        .map(function(value) {
            // Is this the first value to come through the source stream?
            if (values[i] === undefined) {
                ++values.count;
            }

            values[i] = value;

            // Are all the source streams active?
            if (values.count === values.length) {
                // Push the combined output into the stream's buffer
                return fn.apply(null, values);
            }
        })
        .each(push)
        .done(done);
    });

    return { stop };
}

function CombineStream(fn, streams) {
    if (DEBUG && streams.length < 2) {
        throw new Error('CombineStream(fn, streams) requires more than 1 stream')
    }

    return new Stream$1((push, stop) => CombineProducer(push, stop, fn, streams));
}


// Stream.Merge

function MergeSource(notify, stop, sources) {
    var values = [];

    function update(source) {
        values.push.apply(values, toArray(source));
    }

    this.values  = values;
    this.notify  = notify;
    this.sources = sources;
    this.update  = update;
    this.cueStop = stop;

    each(function(source) {
        // Flush the source
        update(source);

        // Listen for incoming values
        source.on(update);
        source.on(notify);
    }, sources);
}

assign$1(MergeSource.prototype, {
    shift: function() {
        if (this.sources.every(isDone$1)) {
            this.stop();
        }

        return this.values.shift();
    },

    stop: function() {
        this.cueStop(this.values.length);
    }
});

Stream$1.Merge = function(source1, source2) {
    const sources = Array.from(arguments);
    return new Stream$1(function(push, stop) {
        return new MergeSource(push, stop, sources);
    });
};


// Stream Timers

Stream$1.Choke = function(time) {
    return new Stream$1(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify();
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};


// Frame timer

var frameTimer = {
    now:     now,
    request: requestAnimationFrame.bind(window),
    cancel:  cancelAnimationFrame.bind(window)
};


// Stream.throttle

function schedule() {
    this.queue = noop;
    this.ref   = this.timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        this.queue = schedule;
        notify();
    };
}

assign$1(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream$1.throttle = function(timer) {
    return new Stream$1(function(notify, stop) {
        timer = typeof timer === 'number' ? new Timer(timer) :
            timer ? timer :
            frameTimer;

        return new ThrottleSource(notify, stop, timer);
    });
};

/**
remove(array, value)
Remove `value` from `array`. Where `value` is not in `array`, does nothing.
**/

function remove(array, value) {
    if (array.remove) { array.remove(value); }
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
    return value;
}

/* Observer */

const $observer = Symbol('observer');

const A$3            = Array.prototype;
const nothing$1      = Object.freeze([]);
const isExtensible = Object.isExtensible;


// Utils

function isArrayLike(object) {
	return object
	&& typeof object === 'object'
	// Slows it down a bit
	//&& object.hasOwnProperty('length')
	&& typeof object.length === 'number' ;
}


// Listeners

function getListeners(object, name) {
	return object[$observer].properties[name]
		|| (object[$observer].properties[name] = []);
}

function fire(fns, value, record) {
	if (!fns) { return; }
    fns = fns.slice(0);
	var n = -1;
	while (fns[++n]) {
        // For OO version
        //fns[n].update(value, record);
		fns[n](value, record);
	}
}


// Observer proxy

function trapGet(target, name, self) {
	// Ignore symbols
	let desc;
	return typeof name !== 'symbol'
		&& ((desc = Object.getOwnPropertyDescriptor(target, name)), !desc || desc.writable)
		&& Observer(target[name])
		|| target[name] ;
}

const arrayHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// We are setting a symbol
		if (typeof name === 'symbol') {
			target[name] = value;
			return true;
		}

		var old = target[name];
		var length = target.length;

		// If we are setting the same value, we're not really setting at all
		if (old === value) { return true; }

		var properties = target[$observer].properties;
		var change;

		// We are setting length
		if (name === 'length') {
			if (value >= target.length) {
				// Don't allow array length to grow like this
				target.length = value;
				return true;
			}

			change = {
				index:   value,
				removed: A$3.splice.call(target, value),
				added:   nothing$1,
			};

			while (--old >= value) {
				fire(properties[old], undefined);
			}
		}

		// We are setting an integer string or number
		else if (+name % 1 === 0) {
			name = +name;

			if (value === undefined) {
				if (name < target.length) {
					change = {
						index:   name,
						removed: A$3.splice.call(target, name, 1),
						added:   nothing$1
					};

					value = target[name];
				}
				else {
					return true;
				}
			}
			else {
				change = {
					index:   name,
					removed: A$3.splice.call(target, name, 1, value),
					added:   [value]
				};
			}
		}

		// We are setting some other key
		else {
			target[name] = value;
		}

		if (target.length !== length) {
			fire(properties.length, target.length);
		}

        // Notify the observer
		fire(properties[name], Observer(value) || value);

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, change);

		// Return true to indicate success
		return true;
	}
};

const objectHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// If we are setting the same value, we're not really setting at all
		if (target[name] === value) { return true; }

        // Set value on target, then use that as value
		target[name] = value;
		value = target[name];

        // Notify the observer
        var properties = target[$observer].properties;
		fire(properties[name], Observer(value) || value);

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, {
			name:    name,
			removed: target[name],
			added:   value
		});

		// Return true to indicate success
		return true;
	}

    //			apply: function(target, context, args) {
    //console.log('MethodProxy', target, context, args);
    //debugger;
    //				return Reflect.apply(target, context, args);
    //			}
};

function createObserver(target) {
	var observer = new Proxy(target, isArrayLike(target) ?
		arrayHandlers :
		objectHandlers
	);

	// This is strict but slow
	//define(target, $observer, {
    //    value: {
    //        observer:   observer,
    //        properties: {},
    //        mutate:     []
    //    }
    //});

	// An order of magnitude faster
	target[$observer] = {
		target:     target,
		observer:   observer,
		properties: {},
		mutate:     []
	};

	return observer;
}

function isObservable(object) {
	// Many built-in objects and DOM objects bork when calling their
	// methods via a proxy. They should be considered not observable.
	// I wish there were a way of whitelisting rather than
	// blacklisting, but it would seem not.

	return object
		// Reject primitives and other frozen objects
		// This is really slow...
		//&& !isFrozen(object)
		// I haven't compared this, but it's necessary for audio nodes
		// at least, but then only because we're extending with symbols...
		// hmmm, that may need to change...
		&& isExtensible(object)
		// This is less safe but faster.
		//&& typeof object === 'object'
		// Reject DOM nodes
		&& !Node.prototype.isPrototypeOf(object)
		// Reject WebAudio context
		&& (typeof BaseAudioContext === 'undefined' || !BaseAudioContext.prototype.isPrototypeOf(object))
		// Reject dates
		&& !(object instanceof Date)
		// Reject regex
		&& !(object instanceof RegExp)
		// Reject maps
		&& !(object instanceof Map)
		&& !(object instanceof WeakMap)
		// Reject sets
		&& !(object instanceof Set)
		&& !(window.WeakSet && object instanceof WeakSet)
		// Reject TypedArrays and DataViews
		&& !ArrayBuffer.isView(object) ;
}

///*
//notify(object, path, value)
//Force the `object`'s Observer to register a mutation at `path`. Pass in `value`
//to override the value actually at the end of the path.
//*/

function notify$1(object, path, value) {
	const observer = object[$observer];
	if (!observer) { return; }
	const fns = observer.properties;
	fire(fns[path], value === undefined ? object[path] : value);

    const mutate = observer.mutate;
	fire(mutate, object);
}

/**
Observer(object)
Create an Observer proxy around `object`. In order for `observe(...)` to detect
mutations, changes must be made to this proxy rather than the original
`object`.
**/

function Observer(object) {
	return !object ? undefined :
		object[$observer] ? object[$observer].observer :
		isObservable(object) ?
			createObserver(object) :
			undefined ;
}

///*
//Target(object)
//*/

function Target(object) {
	return object
		&& object[$observer]
		&& object[$observer].target
		|| object ;
}

/**
parseSelector(string)

Takes a string of the form '[key=value, ... ]' and returns a function isMatch
that returns true when passed an object that matches the selector.
**/

//                 1 key                 2 quote 3 value           4 comma 5 closing bracket
const rselector = /^([^\]=,\s]+)\s*(?:=\s*(['"])?([^\]=,\s]+)\2\s*)?(?:(,)|(])(\s*\.$)?)\s*/;

const fselector = {
    3: function parseValue(match, tokens) {
        match[tokens[1]] =
            tokens[2] ? tokens[3] :
            tokens[3] === 'true' ? true :
            tokens[3] === 'false' ? false :
            isFloatString(tokens[3]) ? parseFloat(tokens[3]) :
            tokens[3] ;

        return match;
    },

    4: parseSelector,

    5: function(match, tokens) {
        return function isMatch(object) {
            let key;

            for (key in match) {
                if (object[key] !== match[key]) {
                    return false;
                }
            }

            return true;
        };
    },

    6: function(match, tokens) {
        throw new Error('Observer: A path may not end with "[key=value]." ' + tokens.input);
    }
};

function isFloatString(string) {
	// Convert to float and back to string to check if it retains
	// the same value.
	const float = parseFloat(string);
	return (float + '') === string;
}

function parse(regex, fns, acc, path) {
    // If path is a regex result, get path from latest index
    const string = typeof path !== 'string' ?
        path.input.slice(path.index + path[0].length + (path.consumed || 0)) :
        path ;

    const tokens = regex.exec(string);
    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + string + ' : ' + path.input);
    }

    let n = -1;
    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && fns[n]) ? fns[n](acc, tokens) : acc ;
    }

    path.consumed = tokens.index + tokens[0].length + (tokens.consumed || 0);

    return acc;
}

function parseSelector(match, path) {
    return parse(rselector, fselector, match, path);
}

function parseSelector$1(path) {
    return parse(rselector, fselector, {}, path);
}

{ window.observeCount = 0; }

const A$4       = Array.prototype;
const nothing$2 = Object.freeze([]);

//                   1 .name         [2 number  3 'quote' 4 "quote" ]
const rpath$2   = /^\.?([^.[\s]+)\s*|^\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|^\[\s*/;

function isPrimitive(object) {
    return !(object && typeof object === 'object');
}

function observePrimitive(primitive, data) {
	if (primitive !== data.value) {
		data.old   = data.value;
		data.value = primitive;
		data.fn(primitive);
	}

	return noop;
}

function observeMutable(object, data) {
	var fns = object[$observer].mutate;
	fns.push(data.fn);

    { ++window.observeCount; }

	if (object !== data.value) {
		data.old   = data.value;
		data.value = object;
		data.fn(object, {
			index:   0,
			removed: data.old ? data.old : nothing$2,
			added:   data.value
		});
	}

	return () => {
		remove(fns, data.fn);

        { --window.observeCount; }
	};
}

function observeSelector(object, isMatch, path, data) {
	var unobserve = noop;

	function update(array) {
		var value = array && A$4.find.call(array, isMatch);
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	// We create an intermediate data object to go with the new update
	// function. The original data object is passed on inside update.
	var unobserveMutable = observeMutable(object, { fn: update });

	return () => {
		unobserve();
		unobserveMutable();
	};
}

function observeProperty(object, name, path, data) {
	var fns = getListeners(object, name);
	var unobserve = noop;

	function update(value) {
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	fns.push(update);
    update(object[name]);

    { ++window.observeCount; }

	return () => {
		unobserve();
		remove(fns, update);

        { --window.observeCount; }
	};
}

function readSelector(object, isMatch, path, data) {
	var value = object && A$4.find.call(object, isMatch);
	return observeUnknown(Observer(value) || value, path, data);
}

function readProperty(object, name, path, data) {
	return observeUnknown(Observer(object[name]) || object[name], path, data);
}

function observeUnknown(object, path, data) {
    // path is ''
    if (!path.length) {
		return observePrimitive(object, data) ;
	}

    // path is '.'
    if (path === '.') {
        // We assume the full isObserver() check has been done –
        // this function is internal after all
        return object && object[$observer] ?
            observeMutable(object, data) :
            observePrimitive(object, data) ;
    }

    // Object is primitive
    if (isPrimitive(object)) {
		return observePrimitive(undefined, data);
	}

    const tokens = rpath$2.exec(path);

    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + path + ' : ' + path.length);
    }

    // path is .name, [number], ['name'] or ["name"]
    const name = tokens[1] || tokens[2] || tokens[3] || tokens[4] ;

    if (name) {
        path = tokens.input.slice(tokens.index + tokens[0].length);
        return object[$observer] ?
            observeProperty(object, name, path, data) :
            readProperty(object, name, path, data) ;
    }

    const isMatch = parseSelector$1(tokens);
    path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

    // path is '[key=value]'
    return object[$observer] ?
        observeSelector(object, isMatch, path, data) :
        readSelector(object, isMatch, path, data) ;
}

/**
observe(path, fn, object [, init])

Observe `path` in `object` and call `fn(value)` with the value at the
end of that path when it mutates. Returns a function that destroys this
observer.

The callback `fn` is called immediately on initialisation if the value at
the end of the path is not equal to `init`. In the default case where
`init` is `undefined`, paths that end in `undefined` do not cause the
callback to be called.

(To force the callback to always be called on setup, pass in `NaN` as an
`init` value. In JS `NaN` is not equal to anything, even `NaN`, so it
always initialises.)
**/

function observe(path, fn, object, initialValue) {
    return observeUnknown(Observer(object) || object, path + '', {
        value: initialValue,
        fn:    fn
    });
}

function ObserveSource(push, stop, args) {
    const path   = args[0];
    const object = args[1];

	this.end = stop;
	this.unobserve = observe(path, (value) => {
		this.value = value === undefined ? null : value ;
		push(this.value);
	}, object);
}

ObserveSource.prototype = {
	shift: function() {
		var value = this.value;
		this.value = undefined;
		return value;
	},

	stop: function() {
		this.unobserve();
		this.end();
	},

	unobserve: noop
};

function mutations(path, object) {
	const args = arguments;
	return new Stream$1(function(push, stop) {
		return new ObserveSource(push, stop, args);
	});
}

function call$1(fn) {
	return fn();
}

// Just for debugging
var loggers = [];

// Pool
function Pool(options, prototype) {
	var create = options.create || noop;
	var reset  = options.reset  || noop;
	var isIdle = options.isIdle;
	var store = [];

	// Todo: This is bad! It keeps a reference to the pools hanging around,
	// accessible from the global scope, so even if the pools are forgotten
	// they are never garbage collected!
	loggers.push(function log() {
		var total = store.length;
		var idle  = store.filter(isIdle).length;
		return {
			name:   options.name,
			total:  total,
			active: total - idle,
			idle:   idle
		};
	});

	return function PoolObject() {
		var object = store.find(isIdle);

		if (!object) {
			object = Object.create(prototype || null);
			create.apply(object, arguments);
			store.push(object);
		}

		reset.apply(object, arguments);
		return object;
	};
}

Pool.release = function() {
	loggers.length = 0;
};

Pool.snapshot = function() {
	return Fn
	.from(loggers)
	.map(call$1)
	.toJSON();
};

/**
append(str2, str1)
Returns `str1 + str2`.
**/

function append(string2, string1) {
    return '' + string1 + string2;
}

var append$1 = curry$1(append);

/**
prepad(chars, n, string)
Pads `string` to `n` characters by prepending `chars`.
**/

function prepad(chars, n, value) {
    var string = value + '';
    var i = -1;
    var pre = '';

    while (pre.length < n - string.length) {
        pre += chars[++i % chars.length];
    }

    string = pre + string;
    return string.slice(string.length - n);
}

var prepad$1 = curry$1(prepad);

/**
postpad(chars, n, string)
Pads `string` to `n` characters by appending `chars`.
**/

function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

var postpad$1 = curry$1(postpad);

/**
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

```js
    slugify('Party on #mydudes!') // 'party-on-mydudes'
```
**/

function slugify(string) {
    if (typeof string !== 'string') { return; }
    return string
    .trim()
    .toLowerCase()
    .replace(/^[\W_]+/, '')
    .replace(/[\W_]+$/, '')
    .replace(/[\W_]+/g, '-');
}

/**
toCamelCase(string)
Capitalises any Letter following a `'-'` and removes the dash.
**/

function toCamelCase(string) {
    // Be gracious in what we accept as input
    return string.replace(/-(\w)?/g, function($0, letter) {
        return letter ? letter.toUpperCase() : '';
    });
}

/**
toPlainText(string)
Normalises string as plain text without accents using canonical decomposition
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize).
**/

function toPlainText(string) {
    return string
    // Decompose string to normalized version
    .normalize('NFD')
    // Remove accents
    .replace(/[\u0300-\u036f]/g, '');
}

const regexes = {
    //         / (  (  (  (   http:         ) //  ) domain          /path   )(more /path  ) /   (path/      ) chars  )(hash or query string      )  /
    url:       /^(?:(?:(?:(?:[fht]{1,2}tps?:)?\/\/)?[-\w]+\.[-\w]+|\/[-\w.]+)(?:\/?[-\w.]+)*\/?|(?:[-\w.]+\/)+[-\w.]*)(?:[#?][#?!\[\]$\,;&=-\w.]*)?$/,
    email:     /^((([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
    date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
    hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
    rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
    hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
    rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
    cssValue:  /^(-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
    cssAngle:  /^(-?\d+(?:\.\d+)?)(deg)?$/,
    image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
    float:     /^[+-]?(?:\d*\.)?\d+$/,
    int:       /^(-?\d+)$/
};

const types = ['url', 'date', 'email', 'float', 'int'];

function toStringType(string) {
    // Determine the type of string from its content.
    var n = types.length;

    // Test regexable string types
    while (n--) {
        if(regexes[types[n]].test(string)) {
            return types[n];
        }
    }

    // Test for JSON
    try {
        JSON.parse(string);
        return 'json';
    }
    catch(e) {}

    // Default to 'string'
    return 'string';
}

function requestTime(s, fn) {
    return setTimeout(fn, s * 1000);
}

const cancelTime = clearTimeout;

function ap(data, fns) {
	let n = -1;
	let fn;
	while (fn = fns[++n]) {
		fn(data);
	}
}

/**
insert(fn, array, object)
Inserts `object` into `array` at the first index where the result of
`fn(object)` is greater than `fn(array[index])`.
**/

const A$5 = Array.prototype;

function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A$5.splice.call(array, n, 0, object);
    return object;
}

/**
take(n, array)
**/

function take(i, object) {
    if (object.slice) { return object.slice(0, i); }
    if (object.take)  { return object.take(i); }

    var a = [];
    var n = i;
    while (n--) { a[n] = object[n]; }
    return a;
}

/**
unique(array)
Takes an array or stream as `array`, returns an object of the same
type without duplicate values.
**/

function uniqueReducer(array, value) {
    if (array.indexOf(value) === -1) { array.push(value); }
    return array;
}

function unique(object) {
    return object.unique ?
        object.unique() :
        reduce(uniqueReducer, [], object) ;
}

/**
update(create, destroy, fn, target, source)

Returns a new array containing items that are either matched objects from
`target` assigned new data from `source` objects or, where no match is found,
new objects created by calling `create` on a `source` object. Any objects
in `target` that are not matched to `source` objects are destroyed by calling
`destroy` on them.
**/

const assign$2 = Object.assign;

function update(create, destroy, fn, target, source) {
    const ids     = target.map(fn);
    const indexes = {};
    const output  = source.map(function(data) {
        const id = fn(data);
        const i  = ids.indexOf(id);

        if (i < 0) {
            return create.prototype ?
                new create(data) :
                create(data);
        }

        // Has it already been processed? Oops.
        if (indexes[i]) {
            throw new Error('Failed to update target array, source data contains duplicates');
        }

        indexes[i] = true;
        return assign$2(target[i], data);
    });

    target.forEach(function(object) {
        if (!output.includes(object)) {
            destroy(object);
        }
    });

    return output;
}

/**
diff(array1, array2)
**/

function diff(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return true; }
        values.splice(i, 1);
        return false;
    }, object)
    .concat(values);
}

function intersect(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return false; }
        values.splice(i, 1);
        return true;
    }, object);
}

function unite(array, object) {
    var values = toArray(array);

    return map(function(value) {
        var i = values.indexOf(value);
        if (i > -1) { values.splice(i, 1); }
        return value;
    }, object)
    .concat(values);
}

/**
last(array)
Gets the last value from an array.
**/

function last(array) {
    if (typeof array.length === 'number') {
        return array[array.length - 1];
    }

    // Todo: handle Fns and Streams
}

function sum(a, b) { return b + a; }
function multiply(a, b) { return b * a; }
function pow(n, x) { return Math.pow(x, n); }
function exp(n, x) { return Math.pow(n, x); }
function log(n, x) { return Math.log(x) / Math.log(n); }
function root(n, x) { return Math.pow(x, 1/n); }

/**
wrap(min, max, n)
**/

function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
}

/**
gaussian()

Generate a random number with a gaussian distribution centred
at 0 with limits -1 to 1.
**/

function gaussian() {
    return Math.random() + Math.random() - 1;
}

const curriedSum   = curry$1(sum);
const curriedMultiply = curry$1(multiply);
const curriedMin   = curry$1(Math.min, false, 2);
const curriedMax   = curry$1(Math.max, false, 2);
const curriedPow   = curry$1(pow);
const curriedExp   = curry$1(exp);
const curriedLog   = curry$1(log);
const curriedRoot  = curry$1(root);
const curriedWrap  = curry$1(wrap);

/**
todB(level)

Converts a value to decibels relative to unity (dBFS).
**/

// A bit disturbingly, a correction factor is needed to make todB() and
// to toLevel() reciprocate more accurately. This is quite a lot to be off
// by... Todo: investigate?
const dBCorrectionFactor = (60 / 60.205999132796244);

function todB(n)    { return 20 * Math.log10(n) * dBCorrectionFactor; }

/**
toLevel(dB)

Converts a dB value relative to unity (dBFS) to unit value.
**/

function toLevel(n) { return Math.pow(2, n / 6); }

/**
toRad(deg)
**/

const angleFactor = 180 / Math.PI;

function toRad(n) { return n / angleFactor; }

/**
toDeg(rad)
**/

function toDeg(n)   { return n * angleFactor; }

/**
gcd(a, b)

Returns the greatest common divider of a and b.
**/

function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
}

const curriedGcd = curry$1(gcd);

/**
lcm(a, b)

Returns the lowest common multiple of a and b.
**/

function lcm(a, b) {
    return a * b / gcd(a, b);
}

const curriedLcm = curry$1(lcm);

/**
factorise(array)

Reduces a fraction (represented by `array` in the form
`[numerator, denominator]`) by finding the greatest common divisor and
dividing by it both values by it.

Returns a new array in the form `[numerator, denominator]`.
**/

function factorise(array) {
    var f = gcd(array[0], array[1]);
    return [array[0] / f, array[1] / f];
}

/**
clamp(min, max, n)
**/

function clamp(min, max, n) {
    return n > max ? max : n < min ? min : n;
}

var clamp$1 = curry$1(clamp);

/**
mod(divisor, n)

JavaScript's modulu operator (`%`) uses Euclidean division, but for
stuff that cycles through 0 the symmetrics of floored division are often
are more useful. This function implements floored division.
**/

function mod(d, n) {
    var value = n % d;
    return value < 0 ? value + d : value;
}

var mod$1 = curry$1(mod);

/**
toPolar(cartesian)
**/

function toPolar(cartesian) {
    var x = cartesian[0];
    var y = cartesian[1];

    return [
        // Distance
        x === 0 ?
            Math.abs(y) :
        y === 0 ?
            Math.abs(x) :
            Math.sqrt(x*x + y*y) ,
        // Angle
        Math.atan2(x, y)
    ];
}

/**
toCartesian(polar)
**/

function toCartesian(polar) {
    var d = polar[0];
    var a = polar[1];

    return [
        Math.sin(a) * d ,
        Math.cos(a) * d
    ];
}

// Cubic bezier function (originally translated from

function sampleCubicBezier(a, b, c, t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((a * t + b) * t + c) * t;
}

function sampleCubicBezierDerivative(a, b, c, t) {
    return (3 * a * t + 2 * b) * t + c;
}

function solveCubicBezierX(a, b, c, x, epsilon) {
    // Solve x for a cubic bezier
    var x2, d2, i;
    var t2 = x;

    // First try a few iterations of Newton's method -- normally very fast.
    for(i = 0; i < 8; i++) {
        x2 = sampleCubicBezier(a, b, c, t2) - x;
        if (Math.abs(x2) < epsilon) {
            return t2;
        }
        d2 = sampleCubicBezierDerivative(a, b, c, t2);
        if (Math.abs(d2) < 1e-6) {
            break;
        }
        t2 = t2 - x2 / d2;
    }

    // Fall back to the bisection method for reliability.
    var t0 = 0;
    var t1 = 1;

    t2 = x;

    if(t2 < t0) { return t0; }
    if(t2 > t1) { return t1; }

    while(t0 < t1) {
        x2 = sampleCubicBezier(a, b, c, t2);
        if(Math.abs(x2 - x) < epsilon) {
            return t2;
        }
        if (x > x2) { t0 = t2; }
        else { t1 = t2; }
        t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failure.
    return t2;
}

function cubicBezier(p1, p2, duration, x) {
    // The epsilon value to pass given that the animation is going
    // to run over duruation seconds. The longer the animation, the
    // more precision is needed in the timing function result to
    // avoid ugly discontinuities.
    var epsilon = 1 / (200 * duration);

    // Calculate the polynomial coefficients. Implicit first and last
    // control points are (0,0) and (1,1).
    var cx = 3 * p1[0];
    var bx = 3 * (p2[0] - p1[0]) - cx;
    var ax = 1 - cx - bx;
    var cy = 3 * p1[1];
    var by = 3 * (p2[1] - p1[1]) - cy;
    var ay = 1 - cy - by;

    var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
    return sampleCubicBezier(ay, by, cy, y);
}

var bezierify = curry$1(cubicBezier, true, 4);

const DEBUG$1 = window.DEBUG === undefined || window.DEBUG;

const defs = {
    // Primitive types

    'boolean': (value) =>
        typeof value === 'boolean',

    'function': (value) =>
        typeof value === 'function',

    'number': (value) =>
        typeof value === 'number',

    'object': (value) =>
        typeof value === 'object',

    'symbol': (value) =>
        typeof value === 'symbol',

    // Functional types
    // Some of these are 'borrowed' from SancturyJS
    // https://github.com/sanctuary-js/sanctuary-def/tree/v0.19.0

    'Any': noop,

    'Array': (value) =>
        Array.isArray(value),

    'ArrayLike': (value) =>
        typeof value.length === 'number',

    'Boolean': (value) =>
        typeof value === 'boolean',

    'Date': (value) =>
        value instanceof Date
        && !Number.isNaN(value.getTime()),

    'Error': (value) =>
        value instanceof Error,

    'Integer': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value,

    'NegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value < 0,

    'NonPositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value <= 0,

    'PositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value > 0,

    'NonNegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value >= 0,

    'Number': (value) =>
        typeof value === 'number'
        && !Number.isNaN(value),

    'NegativeNumber': (value) =>
        typeof value === 'number'
        && value < 0,

    'NonPositiveNumber': (value) =>
        typeof value === 'number'
        && value <= 0,

    'PositiveNumber': (value) =>
        typeof value === 'number'
        && value > 0,

    'NonNegativeNumber': (value) =>
        typeof value === 'number'
        && value >= 0,

    'Null': (value) =>
        value === null,

    'Object': (value) =>
        !!value
        && typeof value === 'object',

    'RegExp': (value) =>
        value instanceof RegExp
};

const checkType = DEBUG$1 ? function checkType(type, value, file, line, message) {
    if (!defs[type]) {
        throw new RangeError('Type "' + type + '" not recognised');
    }

    if (!defs[type](value)) {
        throw new Error(message || 'value not of type "' + type + '": ' + value, file, line);
    }
} : noop ;

const checkTypes = DEBUG$1 ? function checkTypes(types, args, file, line) {
    var n = types.length;

    while (n--) {
        checkType(types[n], args[n], file, line, 'argument ' + n + ' not of type "' + types[n] + '": ' + args[n]);
    }
} : noop ;

function def(notation, fn, file, line) {
    // notation is of the form:
    // 'Type, Type -> Type'
    // Be generous with what we accept as output marker '->' or '=>'
    var parts = notation.split(/\s*[=-]>\s*/);
    var types = parts[0].split(/\s*,\s*/);
    var returnType = parts[1];

    return DEBUG$1 ? function() {
        checkTypes(types, arguments, file, line);
        const output = fn.apply(this, arguments);
        checkType(returnType, output, file, line, 'return value not of type "' + returnType + '": ' + output);
        return output;
    } : fn ;
}

// Normalisers take a min and max and transform a value in that range
// to a value on the normal curve of a given type

const linear = def(
    'Number, Number, Number => Number',
    (min, max, value) => (value - min) / (max - min)
);

const quadratic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/2)
);

const cubic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/3)
);

const logarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => Math.log(value / min) / Math.log(max / min)
);

const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= min ?
            (value / min) / 9 :
            (0.1111111111111111 + (Math.log(value / min) / Math.log(max / min)) / 1.125) ;
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$1 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => bezierify({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[0], end.point[0], begin.handle[0])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[0], end.point[0], end.handle[0])
    }, 1, linear(begin.point[0], end.point[0], value))
);

var normalisers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    linear: linear,
    quadratic: quadratic,
    cubic: cubic,
    logarithmic: logarithmic,
    linearLogarithmic: linearLogarithmic,
    cubicBezier: cubicBezier$1
});

// Denormalisers take a min and max and transform a value into that range
// from the range of a curve of a given type

const linear$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => value * (max - min) + min
);

const quadratic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 2) * (max - min) + min
);

const cubic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 3) * (max - min) + min
);

const logarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => min * Math.pow(max / min, value)
);

const linearLogarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= 0.1111111111111111 ?
            value * 9 * min :
            min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$2 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => linear$1(begin.point[1], end.point[1], bezierify({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[1], end.point[1], begin.handle[1])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[1], end.point[1], end.handle[1])
    }, 1, value))
);

var denormalisers = /*#__PURE__*/Object.freeze({
    __proto__: null,
    linear: linear$1,
    quadratic: quadratic$1,
    cubic: cubic$1,
    logarithmic: logarithmic$1,
    linearLogarithmic: linearLogarithmic$1,
    cubicBezier: cubicBezier$2
});

// Exponential functions
//
// e - exponent
// x - range 0-1
//
// eg.
// var easeInQuad   = exponential(2);
// var easeOutCubic = exponentialOut(3);
// var easeOutQuart = exponentialOut(4);

function exponentialOut(e, x) {
    return 1 - Math.pow(1 - x, e);
}

// Time

// Decimal places to round to when comparing times
const precision = 9;

// Find template tokens for replacement
var rtoken = /([YZMDdhmswz]{2,4}|D|\+-)/g;

function millisecondsToSeconds(n) { return n / 1000; }
function minutesToSeconds(n) { return n * 60; }
function hoursToSeconds(n) { return n * 3600; }
function daysToSeconds(n) { return n * 86400; }
function weeksToSeconds(n) { return n * 604800; }

function secondsToMilliseconds(n) { return n * 1000; }
function secondsToMinutes(n) { return n / 60; }
function secondsToHours(n) { return n / 3600; }
function secondsToDays(n) { return n / 86400; }
function secondsToWeeks(n) { return n / 604800; }

// Months and years are not fixed durations – these are approximate
function secondsToMonths(n) { return n / 2629800; }
function secondsToYears(n) { return n / 31557600; }


function prefix(n) {
	return n >= 10 ? '' : '0';
}

// Hours:   00-23 - 24 should be allowed according to spec
// Minutes: 00-59 -
// Seconds: 00-60 - 60 is allowed, denoting a leap second

//                sign   hh       mm           ss
var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

/**
parseTime(time)

Where `time` is a string it is parsed as a time in ISO time format: as
hours `'13'`, with minutes `'13:25'`, with seconds `'13:25:14'` or with
decimal seconds `'13:25:14.001'`. Returns a number in seconds.

```
const time = parseTime('13:25:14.001');   // 48314.001
```

Where `time` is a number it is assumed to represent a time in seconds
and is returned directly.

```
const time = parseTime(60);               // 60
```
**/

const parseTime = overload(toType, {
	number:  id,
	string:  exec$1(rtime, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

const parseTimeDiff = overload(toType, {
	number:  id,
	string:  exec$1(rtimediff, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});


function createTime(match, sign, hh, mm, sss) {
	var time = hoursToSeconds(parseInt(hh, 10))
        + (mm ? minutesToSeconds(parseInt(mm, 10))
            + (sss ? parseFloat(sss, 10) : 0)
        : 0) ;

	return sign === '-' ? -time : time ;
}

function formatTimeString(string, time) {
	return string.replace(rtoken, function($0) {
		return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
	}) ;
}

function _formatTimeISO(time) {
	var sign = time < 0 ? '-' : '' ;

	if (time < 0) { time = -time; }

	var hours = Math.floor(time / 3600);
	var hh = prefix(hours) + hours ;
	time = time % 3600;
	if (time === 0) { return sign + hh + ':00'; }

	var minutes = Math.floor(time / 60);
	var mm = prefix(minutes) + minutes ;
	time = time % 60;
	if (time === 0) { return sign + hh + ':' + mm; }

	var sss = prefix(time) + toMaxDecimals(precision, time);
	return sign + hh + ':' + mm + ':' + sss;
}

function toMaxDecimals(precision, n) {
	// Make some effort to keep rounding errors under control by fixing
	// decimals and lopping off trailing zeros
	return n.toFixed(precision).replace(/\.?0+$/, '');
}


const nowTime = function() {
	return window.performance.now();
};

/**
formatTime(format, time)
Formats `time`, an 'hh:mm:ss' time string or a number in seconds, to match
`format`, a string that may contain the tokens:

- `'±'`   Sign, renders '-' if time is negative, otherwise nothing
- `'Y'`   Years, approx.
- `'M'`   Months, approx.
- `'MM'`  Months, remainder from years (max 12), approx.
- `'w'`   Weeks
- `'ww'`  Weeks, remainder from months (max 4)
- `'d'`   Days
- `'dd'`  Days, remainder from weeks (max 7)
- `'h'`   Hours
- `'hh'`  Hours, remainder from days (max 24), 2-digit format
- `'m'`   Minutes
- `'mm'`  Minutes, remainder from hours (max 60), 2-digit format
- `'s'`   Seconds
- `'ss'`  Seconds, remainder from minutes (max 60), 2-digit format
- `'sss'` Seconds, remainder from minutes (max 60), fractional
- `'ms'`  Milliseconds, remainder from seconds (max 1000), 3-digit format

```
const time = formatTime('±hh:mm:ss', 3600);   // 01:00:00
```
**/

var timeFormatters = {
	'±': function sign(time) {
		return time < 0 ? '-' : '';
	},

	Y: function Y(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToYears(time));
	},

	M: function M(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time));
	},

	MM: function MM(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time % 31557600));
	},

	W: function W(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToWeeks(time));
	},

	WW: function WW(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 2629800));
	},

	d: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time));
	},

	dd: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 604800));
	},

	h: function hhh(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToHours(time));
	},

	hh: function hh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time % 86400));
		return prefix(hours) + hours;
	},

	m: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time));
		return prefix(minutes) + minutes;
	},

	mm: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time % 3600));
		return prefix(minutes) + minutes;
	},

	s: function s(time) {
		time = time < 0 ? -time : time;
		return Math.floor(time);
	},

	ss: function ss(time) {
		time = time < 0 ? -time : time;
		var seconds = Math.floor(time % 60);
		return prefix(seconds) + seconds;
	},

	sss: function sss(time) {
		time = time < 0 ? -time : time;
		var seconds = time % 60;
		return prefix(seconds) + toMaxDecimals(precision, seconds);
	},

	ms: function ms(time) {
		time = time < 0 ? -time : time;
		var ms = Math.floor(secondsToMilliseconds(time % 1));
		return ms >= 100 ? ms :
			ms >= 10 ? '0' + ms :
				'00' + ms;
	}
};

const formatTime = curry$1(function(string, time) {
	return string === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(string, parseTime(time)) ;
});

/**
formatTimeISO(time)
Formats `time`, an 'hh:mm:sss' time string or a number in seconds, as a string
in the ISO time format.
```
**/

function formatTimeISO(time) {
	// Undefined causes problems by outputting dates full of NaNs
	return time === undefined ? undefined : _formatTimeISO(time);
}

/**
addTime(time1, time2)

Sums `time2` and `time1`, which may be 'hh:mm:sss' time strings or numbers in
seconds, and returns time as a number in seconds. `time1` may contain hours
outside the range 0-24 or minutes or seconds outside the range 0-60. For
example, to add 75 minutes to a list of times you may write:

```
const laters = times.map(addTime('00:75'));
```
*/

const addTime = curry$1(function(time1, time2) {
	return parseTime(time2) + parseTimeDiff(time1);
});

const subTime = curry$1(function(time1, time2) {
	return parseTime(time2) - parseTimeDiff(time1);
});

const diffTime = curry$1(function(time1, time2) {
	return parseTime(time1) - parseTime(time2);
});

/**
floorTime(token, time)

Floors time to the start of the nearest `token`, where `token` is one of:

- `'w'`   Week
- `'d'`   Day
- `'h'`   Hour
- `'m'`   Minute
- `'s'`   Second
- `'ms'`  Millisecond

`time` may be an ISO time string or a time in seconds. Returns a time in seconds.

```
const hourCounts = times.map(floorTime('h'));
```
**/

var _floorTime = choose({
	w:  function(time) { return time - mod(604800, time); },
	d:  function(time) { return time - mod(86400, time); },
	h:  function(time) { return time - mod(3600, time); },
	m:  function(time) { return time - mod(60, time); },
	s:  function(time) { return time - mod(1, time); },
	ms: function(time) { return time - mod(0.001, time); }
});

const floorTime = curry$1(function(token, time) {
	return _floorTime(token, parseTime(time));
});

function createOrdinals(ordinals) {
	var array = [], n = 0;

	while (n++ < 31) {
		array[n] = ordinals[n] || ordinals.n;
	}

	return array;
}

var langs = {
	'en': {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	},

	'fr': {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createOrdinals({ n: "ième", 1: "er" })
	},

	'de': {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createOrdinals({ n: "er" })
	},

	'it': {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createOrdinals({ n: "o" })
	}
};


// Date string parsing
//
// Don't parse date strings with the JS Date object. It has variable
// time zone behaviour. Set up our own parsing.
//
// Accept BC dates by including leading '-'.
// (Year 0000 is 1BC, -0001 is 2BC.)
// Limit months to 01-12
// Limit dates to 01-31

var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
//                sign   year        month       day               T or -
var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

/**
parseDate(date)

Parse a date, where, `date` may be:

- a string in ISO date format
- a number in seconds UNIX time
- a date object

Returns a date object (or *the* date object, if it represents a valid date).
**/

const parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDate(date) date is not of a supported type (' + (typeof date) + ')');
    }
});

/**
parseDateLocal(date)

As `parseDate(date)`, but returns a date object with local time set to the
result of the parse.
**/

const parseDateLocal = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDateLocal),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDateLocal: date is not of a supported type (number, string, Date)');
    }
});

function isValidDate(date) {
	return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
}

function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	var date = new Date(
		ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
		second ? Date.UTC(year, month, day, hour, minute, second) :
		minute ? Date.UTC(year, month, day, hour, minute) :
		hour ?   Date.UTC(year, month, day, hour) :
		day ?    Date.UTC(year, month, day) :
		month ?  Date.UTC(year, month) :
		Date.UTC(year)
	);

	if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
		setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
	}

	return date;
}

function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
	if (zone) {
		throw new Error('createDateLocal() will not parse a string with a time zone "' + zone + '".');
	}

	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	return ms ?  new Date(year, month, day, hour, minute, second, ms) :
		second ? new Date(year, month, day, hour, minute, second) :
		minute ? new Date(year, month, day, hour, minute) :
		hour ?   new Date(year, month, day, hour) :
		day ?    new Date(year, month, day) :
		month ?  new Date(year, month) :
		new Date(year) ;
}

function secondsToDate(n) {
	return new Date(n * 1000);
}

function setTimeZoneOffset(sign, hour, minute, date) {
	if (sign === '+') {
		date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
		}
	}
	else if (sign === '-') {
		date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
		}
	}

	return date;
}



// Date object formatting
//
// Use the internationalisation methods for turning a date into a UTC or
// locale string, the date object for turning them into a local string.

var dateFormatters = {
	YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
	YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
	MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
	MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
	MMMM: function(date, lang) { return langs[lang].months[date.getMonth()]; },
	D:    function(date)       { return '' + date.getDate(); },
	DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
	ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
	dddd: function(date, lang) { return langs[lang].days[date.getDay()]; },
	hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
	//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
	mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
	ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
	sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	ms:   function(date)       { return '' + date.getMilliseconds(); },

	// Experimental
	am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
	zz:   function(date) {
		return (date.getTimezoneOffset() < 0 ? '+' : '-') +
			 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
	},
	th:   function(date, lang) { return langs[lang].ordinals[date.getDate()]; },
	n:    function(date) { return +date; },
	ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
};

var componentFormatters = {
	YYYY: function(data)       { return data.year; },
	YY:   function(data)       { return ('0' + data.year).slice(-2); },
	MM:   function(data)       { return data.month; },
	MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
	MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
	D:    function(data)       { return parseInt(data.day, 10) + ''; },
	DD:   function(data)       { return data.day; },
	DDD:  function(data)       { return data.weekday.slice(0,3); },
	DDDD: function(data, lang) { return data.weekday; },
	hh:   function(data)       { return data.hour; },
	//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
	mm:   function(data)       { return data.minute; },
	ss:   function(data)       { return data.second; },
	//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	//ms:   function(data)       { return '' + date.getMilliseconds(); },
};

var componentKeys = {
	// Components, in order of appearance in the locale string
	'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
	// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
	// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
	default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
};

var options = {
	// Time zone
	timeZone:      'UTC',
	// Use specified locale matcher
	formatMatcher: 'basic',
	// Use 24 hour clock
	hour12:        false,
	// Format string components
	weekday:       'long',
	year:          'numeric',
	month:         '2-digit',
	day:           '2-digit',
	hour:          '2-digit',
	minute:        '2-digit',
	second:        '2-digit',
	//timeZoneName:  'short'
};

var rtoken$1    = /([YZMDdhmswz]{2,4}|D|\+-)/g;
var rusdate   = /\w{3,}|\d+/g;
var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

function matchEach(regex, fn, text) {
	var match = regex.exec(text);
	if (!match) { return; }
	fn.apply(null, match);
	matchEach(regex, fn, text);
}

function toLocaleString(timezone, locale, date) {
	options.timeZone = timezone || 'UTC';
	var string = date.toLocaleString(locale, options);
	return string;
}

function toLocaleComponents(timezone, locale, date) {
	var localedate = toLocaleString(timezone, locale, date);
	var components = {};
	var keys       = componentKeys[locale] || componentKeys.default;
	var i          = 0;

	matchEach(rusdate, function(value) {
		components[keys[i++]] = value;
	}, localedate);

	components.milliseconds = +date % 1000;
	return components;
}

function _formatDate(string, timezone, locale, date) {
	// Derive lang from locale
	var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

	// Todo: only en-US and fr supported for the time being
	locale = locale === 'en' ? 'en-US' :
		locale ? locale :
		'en-US';

	var data    = toLocaleComponents(timezone, locale, date);
	var formats = componentFormatters;

	return string.replace(rtoken$1, function($0) {
		return formats[$0] ?
			formats[$0](data, lang) :
			$0 ;
	});
}

/**
formatDate(format, locale, timezone, date)
Formats `date`, an ISO string or number in seconds or a JS date object,
to the format of the string `format`. The format string may contain the tokens:

- `'YYYY'` years
- `'YY'`   2-digit year
- `'MM'`   month, 2-digit
- `'MMM'`  month, 3-letter
- `'MMMM'` month, full name
- `'D'`    day of week
- `'DD'`   day of week, two-digit
- `'DDD'`  weekday, 3-letter
- `'DDDD'` weekday, full name
- `'hh'`   hours
- `'mm'`   minutes
- `'ss'`   seconds

The `locale` string may be `'en'` or `'fr'`. The `'timezone'` parameter is
either `'UTC'` or an IANA timezone such as '`Europe/Zurich`'
([timezones on Wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)).

```
const date = formatDate('YYYY', 'en', 'UTC', new Date());   // 2020
```
*/

const formatDate = curry$1(function (format, locale, timezone, date) {
	return format === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(format, locale, date) :
	_formatDate(format, timezone, locale, parseDate(date)) ;
});

/**
formatDateLocal(format, locale, date)

As `formatDate(date)`, but returns a date object with local time set to the
result of the parse.
**/

function formatDateLocal(format, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return format.replace(rtoken$1, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

/**
formatDateISO(date)
Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
a string in the ISO date format.
*/

function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}

/**
formatDateTimeISO(date)
Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
a string in the ISO datetime format.
*/

function formatDateTimeISO(date) {
	return JSON.stringify(parseDate(date)).slice(1,-1);
}



// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};



/*
toDay(date)
Returns day of week as a number, where monday is `0`.
*/

const dayMap = [6,0,1,2,3,4,5];

function toDay(date) {
	return dayMap[date.getDay()];
}

/*
cloneDate(date)
Returns new date object set to same date.
*/

function cloneDate(date) {
	return new Date(+date);
}

function addDateComponents(sign, yy, mm, dd, date) {
	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

	if (!mm) { return; }

	// Adding and subtracting months can give weird results with the JS
	// date object. For example, taking a month away from 2018-03-31 results
	// in 2018-03-03 (or the 31st of February), whereas adding a month on to
	// 2018-05-31 results in the 2018-07-01 (31st of June).
	//
	// To mitigate this weirdness track the target month and roll days back
	// until the month is correct, like Python's relativedelta utility:
	// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
	var month       = date.getUTCMonth();
	var monthDiff   = sign * parseInt(mm, 10);
	var monthTarget = mod(12, month + monthDiff);

	date.setUTCMonth(month + monthDiff);

	// If the month is too far in the future scan backwards through
	// months until it fits. Setting date to 0 means setting to last
	// day of previous month.
	while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

	if (!dd) { return; }

	date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
}

function _addDate(duration, date) {
	// Don't mutate the original date
	date = cloneDate(date);

	// First parse the date portion duration and add that to date
	var tokens = rdatediff.exec(duration) ;
	var sign = 1;

	if (tokens) {
		sign = tokens[1] === '-' ? -1 : 1 ;
		addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

		// If there is no 'T' separator go no further
		if (!tokens[5]) { return date; }

		// Prepare duration for time parsing
		duration = duration.slice(tokens[0].length);

		// Protect against parsing a stray sign before time
		if (duration[0] === '-') { return date; }
	}

	// Then parse the time portion and add that to date
	var time = parseTimeDiff(duration);
	if (time === undefined) { return; }

	date.setTime(date.getTime() + sign * time * 1000);
	return date;
}

function diff$1(t, d1, d2) {
	var y1 = d1.getUTCFullYear();
	var m1 = d1.getUTCMonth();
	var y2 = d2.getUTCFullYear();
	var m2 = d2.getUTCMonth();

	if (y1 === y2 && m1 === m2) {
		return t + d2.getUTCDate() - d1.getUTCDate() ;
	}

	t += d2.getUTCDate() ;

	// Set to last date of previous month
	d2.setUTCDate(0);
	return diff$1(t, d1, d2);
}

function _diffDateDays(date1, date2) {
	var d1 = parseDate(date1);
	var d2 = parseDate(date2);

	return d2 > d1 ?
		// 3rd argument mutates, so make sure we get a clean date if we
		// have not just made one.
		diff$1(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
		diff$1(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
}

function floorDateByGrain(token, date) {
	var diff, week;

	if (token === 'ms') { return date; }

	date.setUTCMilliseconds(0);
	if (token === 's') { return date; }

	date.setUTCSeconds(0);
	if (token === 'm') { return date; }

	date.setUTCMinutes(0);
	if (token === 'h') { return date; }

	date.setUTCHours(0);
	if (token === 'd') { return date; }

	if (token === 'w') {
		date.setDate(date.getDate() - toDay(date));
		return date;
	}

	if (token === 'fortnight') {
		week = floorDateByDay(1, new Date());
		diff = mod(14, _diffDateDays(week, date));
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	date.setUTCDate(1);
	if (token === 'M') { return date; }

	date.setUTCMonth(0);
	if (token === 'Y') { return date; }

	date.setUTCFullYear(0);
	return date;
}

function floorDateByDay(day, date) {
	var currentDay = date.getUTCDay();

	// If we are on the specified day, return this date
	if (day === currentDay) { return date; }

	var diff = currentDay - day;
	if (diff < 0) { diff = diff + 7; }
	return _addDate('-0000-00-0' + diff, date);
}

function _floorDate(token, date) {
	// Clone date before mutating it
	date = cloneDate(date);
	return typeof token === 'number' ? floorDateByDay(token, date) :
        days[token] ? floorDateByDay(days[token], date) :
	    floorDateByGrain(token, date) ;
}

function nowDate() {
	return new Date();
}

function dateDiff(d1, d2) {
	return +parseDate(d2) - +parseDate(d1);
}

function toTimestamp(date) {
	return date.getTime() / 1000;
}

/**
addDate(diff, date)
Sums `diff` and `date`, where `diff` is a string in ISO date format. Returns
a new date object.

```
const addWeek = addDate('0000-00-07');
const sameTimeNextWeek = addWeek(new Date());
```
*/

const addDate = curry$1(function(diff, date) {
	return _addDate(diff, parseDate(date));
});

const diffDateDays = curry$1(_diffDateDays);

/**
floorDate(token, date)
Floors date to the start of nearest calendar point in increment indicated
by `token`:

- `'Y'`   Year
- `'M'`   Month
- `'w'`   Week
- `'d'`   Day
- `'h'`   Hour
- `'m'`   Minute
- `'s'`   Second
- `'mon'` Monday
- `'tue'` Tuesday
- `'wed'` Wednesday
- `'thu'` Thursday
- `'fri'` Friday
- `'sat'` Saturday
- `'sun'` Sunday

```
const dayCounts = times.map(floorDate('d'));
```
*/

const floorDate = curry$1(function(token, date) {
	return _floorDate(token, parseDate(date));
});

var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

var domify = overload(toType$1, {
	'string': createArticle,

	'function': function(template, name, size) {
		return createArticle(multiline(template), name, size);
	},

	'default': function(template) {
		// WHAT WHY?
		//var nodes = typeof template.length === 'number' ? template : [template] ;
		//append(nodes);
		//return nodes;
	}
});

var browser = /firefox/i.test(navigator.userAgent) ? 'FF' :
	document.documentMode ? 'IE' :
	'standard' ;

const createSection = cache(function createSection() {
	const section = document.createElement('section');
	section.setAttribute('class', 'test-section');
	document.body.appendChild(section);
	return section;
});

function createArticle(html, name, size) {
	const section = createSection();

	const article = document.createElement('article');
	article.setAttribute('class', 'span-' + (size || 2) + '-test-article test-article');

	const title = document.createElement('h2');
	title.setAttribute('class', 'test-title');
	title.innerHTML = name;

	const div = document.createElement('div');
	div.setAttribute('class', 'test-fixture');

	div.innerHTML = html;
	article.appendChild(title);
	article.appendChild(div);
	section.appendChild(article);

	return {
		section: section,
		article: article,
		title:   title,
		fixture: div
	};
}

function multiline(fn) {
	if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
	var match = rcomment.exec(fn.toString());
	if (!match) { throw new TypeError('multiline: comment missing.'); }
	return match[1];
}

function toType$1(object) {
	return typeof object;
}

function equals$2(expected, value, message) {
	if (!equals(value, expected)) {
		var string = (
			'Expected ' + (JSON.stringify(expected) || typeof value) + ', ' +
			'received ' + (JSON.stringify(value) || typeof value) + '.' +
			( message ? ' ' + message : '')
		);

		if (browser === 'IE') {
			console.log(string);
			console.trace();
		}
		else {
			console.trace(
				'%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #ee8833; font-weight: 300;',
				'failed',
				'expected:', (JSON.stringify(expected) || expected),
				'received:', (JSON.stringify(value) || value),
				message || ''
			);
		}
	}
}

function group(name, fn, template, size) {
	if (browser === 'IE') {
		console.log(name);
	}
	else {
		console.log('%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #6f9940; font-weight: 300;', name);
	}

	var nodes = template && domify(template, name, size);
	var tests = [];

	function next() {
		var args = tests.shift();

		if (!args) {
			// Last test has run
			if (nodes) {
				nodes.article.className += ' test-passed';
			}

			return;
		}

		test(args[0], args[1], args[2], next);
	}

	fn(function test(name, fn, n) {
		tests.push(arguments);
	}, console.log.bind(console, '%cTest%c %s', 'color: #6f9940; font-weight: 600;', 'color: #b4d094; font-weight: 300;'), nodes && nodes.fixture);

	next();
}

function stopped() {
	if (browser === 'IE') {
		console.log('Test failed: assertion recieved after test stopped with done().');
		console.trace();
	}
	else {
		console.trace('%c' +
			'Test failed: assertion recieved after test stopped with done().'
		);
	}
}

function test(name, fn, n, next) {
	//console.log('%c' + name, 'color: #6f6f6f; font-weight: 300;');

	var i = 0;
	var eq = equals$2;

	function assert(expected, value, message) {
		++i;
		return eq.apply(null, arguments);
	}

	fn(assert, function done() {
		eq = stopped;

		if (n !== undefined && i !== n) {
			var string = 'Test failed: ' +
			'expected ' + n + ' assertions, ' +
			'received ' + i;

			if (browser === 'IE') {
				console.log('✘ ' + name);
				console.log(string);
				console.trace();
			}
			else {
				console.log('%c✘ ' + name, 'color: #ee8833; font-weight: 300;');
				console.trace('%c' + string, 'color: #ee8833; font-weight: 700;');
			}
		}
		else {
			if (browser === 'IE') {
				console.log('✔',  + name);
			}
			else {
				console.log('%c✔%c %s', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', name);
			}
		}

		next();
	});
}

// #e2006f
// #332256

if (window.console && window.console.log) {
    window.console.log('%cFn%c          - https://stephen.band/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const requestTime$1 = curry$1(requestTime, true, 2);

const toFloat = parseFloat;
const and     = curry$1(function and(a, b) { return !!(a && b); });
const or      = curry$1(function or(a, b) { return a || b; });
const xor     = curry$1(function xor(a, b) { return (a || b) && (!!a !== !!b); });
const assign$3  = curry$1(Object.assign, true, 2);
const define  = curry$1(Object.defineProperties, true, 2);

const by$1          = curry$1(by, true);
const byAlphabet$1  = curry$1(byAlphabet);

const ap$1          = curry$1(ap, true);
const concat$1      = curry$1(concat, true);
const contains$1    = curry$1(contains, true);
const each$1        = curry$1(each, true);
const filter$1      = curry$1(filter, true);
const find$1        = curry$1(find, true);
const map$1         = curry$1(map, true);
const reduce$2      = curry$1(reduce, true);
const remove$1      = curry$1(remove, true);
const rest$1        = curry$1(rest, true);
const slice$1       = curry$1(slice, true, 3);
const sort$1        = curry$1(sort, true);
const insert$1      = curry$1(insert, true);
const take$1        = curry$1(take, true);
const update$1      = curry$1(update, true);

const diff$2        = curry$1(diff, true);
const intersect$1   = curry$1(intersect, true);
const unite$1       = curry$1(unite, true);
const normalise   = curry$1(choose(normalisers), false, 4);
const denormalise = curry$1(choose(denormalisers), false, 4);
const exponentialOut$1 = curry$1(exponentialOut);



const add = curry$1(function (a, b) {
    console.trace('Deprecated: module add() is now sum()');
    return a + b;
});

export { Fn, mutations as Observable, Observer, Pool, privates as Privates, Throttle$1 as PromiseThrottle, Stream$1 as Stream, Target, Throttle, Timer, add, addDate, addTime, and, ap$1 as ap, append$1 as append, args, argument, assign$3 as assign, by$1 as by, byAlphabet$1 as byAlphabet, cache, call, cancelTime, capture$1 as capture, choke, choose, clamp$1 as clamp, cloneDate, compose, concat$1 as concat, contains$1 as contains, bezierify as cubicBezier, curry$1 as curry, dateDiff, daysToSeconds, define, denormalise, deprecate, diff$2 as diff, diffDateDays, diffTime, each$1 as each, equals$1 as equals, exec$1 as exec, curriedExp as exp, exponentialOut$1 as exponentialOut, factorise, filter$1 as filter, find$1 as find, floorDate, floorTime, formatDate, formatDateISO, formatDateLocal, formatDateTimeISO, formatTime, formatTimeISO, gaussian, curriedGcd as gcd, get$1 as get, getPath$1 as getPath, has$1 as has, hoursToSeconds, id, insert$1 as insert, intersect$1 as intersect, invoke$1 as invoke, is$1 as is, isDefined, last, latest, curriedLcm as lcm, curriedLog as log, map$1 as map, matches$1 as matches, curriedMax as max, millisecondsToSeconds, curriedMin as min, minutesToSeconds, mod$1 as mod, curriedMultiply as multiply, mutations, noop, normalise, not, nothing, notify$1 as notify, now, nowDate, nowTime, observe, once, or, overload, parseDate, parseDateLocal, parseInteger as parseInt, parseTime, parseTimeDiff, pipe, postpad$1 as postpad, curriedPow as pow, prepad$1 as prepad, prepend$1 as prepend, print, reduce$2 as reduce, remove$1 as remove, requestTick, requestTime$1 as requestTime, rest$1 as rest, curriedRoot as root, secondsToDays, secondsToHours, secondsToMilliseconds, secondsToMinutes, secondsToMonths, secondsToWeeks, secondsToYears, self, set$1 as set, setPath$1 as setPath, slice$1 as slice, slugify, sort$1 as sort, subTime, curriedSum as sum, take$1 as take, group as test, throttle, toArray, toCamelCase, toCartesian, toClass, toDay, toDeg, toFixed$1 as toFixed, toFloat, toLevel, toPlainText, toPolar, toRad, toString, toStringType, toTimestamp, toType, todB, unique, unite$1 as unite, update$1 as update, weakCache, weeksToSeconds, curriedWrap as wrap, xor };
