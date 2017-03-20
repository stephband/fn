# Fn

A library of functional functions.


### Functional functions

##### `noop()`

Returns `undefined`.

##### `id(object)`

Returns `object`.

##### `cache(fn)`

    var fn2 = Fn.cache(fn);

Caches the results of calls to `fn2(value)`.

##### `curry(fn)`

    var fn2 = Fn.curry(fn);

Curries `fn`. If `fn` normally requires 3 parameters, the curried result can
take those parameters in any grouping:

    fn2(a, b, c);
    fn2(a)(b)(c);
    fn2(a, b)(c);

##### `cacheCurry(fn)`

    var fn2 = Fn.cacheCurry(fn);

Like `Fn.curry()`, only the results of calls with each consecutive parameter
are also cached such that `fn` is only ever called once for each unique set of
parameters.

##### `compose(fn2, fn1)`

Composes two functions into a single function, where `fn2` is passed the result
of `fn1` and the result is returned.

##### `flip(fn)`

Returns a function that calls `fn` with it's parameters in reverse order.

##### `once(fn)`

    var fn2 = Fn.once(fn1);

Calls `fn1` once, the first time `fn2` is called.
Subsequent calls to `fn2` return the value from the first run.

##### `partial(fn1, fn2, fn3, ...)`

Curries several functions into one, where `fn1` is invoked (as soon it has
received enough arguments) and it's return value (an array) passed to `fn2`
when it has received enough arguments, and so on.

##### `pipe(fn1, fn2, fn3, ...)`

Composes functions into a pipe.
`fn2` is passed the result of `fn1`, `fn3` is passed the result of `fn2` and
so on until the result of the last function is returned.

##### `apply(params, fn)`

Calls `fn` with `params`.

##### `bind(params, fn)`

    var fn = bind([0,1,2,3], function() {...})

Returns a function that applies `params` to `fn` when called.
The `this` context inside `fn` is unchanged.

##### `Throttle(fn, request)`

Returns a function that calls fn immediately and thereafter every `time` seconds
while it is called again with new context and arguments.

##### `Wait(fn, time)`

Returns a function that waits for `time` seconds without being invoked
before calling `fn` using the context and arguments from its latest invocation.

    var wait = Fn.Wait(console.log, 1.5);

	wait(1);
	wait(2);
	wait(3);

	// 1.5 seconds later:
	// > 3

### Types

##### `toType(object)`
##### `toClass(object)`
##### `toArray(object)`
##### `toInt(object)`
##### `toString(object)`

##### `equals(a, b)`

Test for deep equality.

##### `is(a, b)`

Test for referential equality.

##### `isDefined(object)`

Test returns `false` if `object` is `null` or `undefined` or `NaN`.

##### `isIn(array, object)`

Test for presence of `object` in `array`.

##### `not(object)`


### Objects

##### `assign(source, object)`

Copies keys of `object` to `source`.

##### `get(key, object)`

Gets property `key` of `object`, where `object` has a `get` method (eg. Map,
WeakMap) or where `key` is a property of object.

##### `set(key, object, value)`

Sets property `key` of `object`, where `object` has a `set` method (eg. Map,
WeakMap) or where object can have `key` set on it.

##### `invoke(name, object)`
Invokes method `name` of `object`.

### Arrays and array-like objects

##### `concat(array2, array1)`

Concatenates `list2` to `list1`. More robust than Array#concat as it handles
arrays, array-like objects, functors and streams.

##### `diff(array1, array2)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `intersect(array1, array2)`
##### `map(fn, object)`
Delegates to `object.map` or applies `Array.prototype.map` to `object`.

##### `reduce(fn, seed, object)`
##### `sort(fn, object)`
##### `unite(array1, array2)`
##### `unique(array)`
##### `throttle([time,] fn)`
##### `by(key, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`

### Numbers

##### `add(n, m)`
##### `multiply(n, m)`
##### `dB(n)`
Returns `n` as a ratio to unity, expressed in dB.

##### `denormalise(min, max, n)`
Denormalises `n` from range 0-1 to range `min`-`max`.

##### `gaussian()`
Returns a random number with a bell curve probability centred
around 0 and limits -1 to 1.

##### `gcd(n, m)`
Greatest common denominator.

##### `lcm(n, m)`
Lowest common multiple.

##### `limit(min, max, n)`
##### `log(base, n)`
##### `max(n, m)`
##### `min(n, m)`
##### `mod(n, m)`
##### `normalise(min, max, n)`
Normalises `n` from range `min`-`max` to range 0-1.

##### `pow(n, m)`
##### `toFixed(n, value)`
##### `toCartesian(array)`
##### `toPolar(array)`
##### `radToDeg(n)`
##### `degToRad(n)`
##### `wrap(min, max, n)`

### Strings

##### `slugify(string)`
##### `toStringType(string)`

    Fn.toStringType('http://cruncher.ch');  // 'url'
    Fn.toStringType('hello@cruncher.ch');   // 'email'
    Fn.toStringType('42');                  // 'int'
    Fn.toStringType('41.5');                // 'float'
    Fn.toStringType('{}');                  // 'json'
    Fn.toStringType('...');                 // 'string'

### Time

##### `now()`
Returns `performance.now()` or date time, in seconds.

##### `requestTick(fn)`
Calls `fn` at the end of the current tick.
This helper is called `setImmediate` in other libraries.

## Fn()

Create a functor: a lazy, mappable, readable list of values with chainable
methods. A functor is a fantasy-land compliant Functor, Applicative and Monad.

##### `Fn(fn)`

    var f = Fn(function() { return 6; })

Values can be extracted from a functor with `.shift()`:

    f.shift() // 6
    f.shift() // 6
    ...

Or with `.next()`, which makes a functor an iterable:

    f.next().value // 6
    f.next().done  // undefined
    ...

##### `Fn(array)`

Creates a functor from an array or array-like object.

##### `Fn.of(value, ...)`

Creates a functor of the arguments.

#### Transform

##### `ap(object)`
##### `chain(fn)`
##### `concat(stream)`
##### `dedup()`
##### `filter(fn)`
##### `group(fn)`
##### `head()`
##### `join()`
##### `last()`
##### `map(fn)`
##### `partition(n)`
##### `fold(fn, seed)`
##### `reduce(fn, seed)`
##### `slice(n, m)`
##### `sort(fn)`
##### `split()`
##### `tail()`
##### `tap(fn)`
##### `unique()`

#### Time

##### `choke(time)`
##### `clock(request)`
##### `delay(time)`
##### `throttle(request)`

#### Input

##### `buffer()`

Give the functor an `.unshift()` method, creating an entry point for unshifting
values back into the flow.

#### Consume

##### `each(fn)`
##### `find(fn)`
##### `next()`
##### `pipe(stream)`
##### `shift()`
##### `toArray()`
##### `toJSON()`
##### `toString()`

#### Create

##### `clone()`
##### `of(value, ...)`

Create a functor of values.

## Stream()

Streams are pushable, observable functors. Streams inherit all methods of a
functor, plus they also get a `.push` method and
are observed for `"push"` and events with `.on(type, fn)`.

##### `Stream(shift, push, stop)`

Creates a stream from functions.

	var i = 0;
    var stream = Fn.Stream(function shift() {
		return ++i;
    });

##### `Stream(array)`

Creates a functor from an array or array-like object.

##### `Stream.of(value1, value2, ...)`

Create a buffered stream of values.

#### Transform

##### `merge()`

#### Input

##### `push(value, ...)`

#### Observe

##### `on(fn)`
##### `off(n)`

## More Streams

##### `Stream.Choke()`

Create a stream that chokes the flow of values to flow one per frame, where
a frame is a browser animation frame.

##### `Stream.Delay(duration)`

Create a stream that delays the flow of pushed values by `duration` seconds.

##### `Stream.Throttle()`

Create a stream that throttles the flow of values to the latest value per frame,
where a frame is a browser animation frame.

##### `Stream.Timer()`

Create a stream that emits values at constant intervals.

## Pool(options, prototype)

Creates a pseudo-constructor function for pooled objects.

    var Thing = Pool({
	    create: function(...) { ... },
        reset:  function(...) { ... },
        isIdle: function(object) { ... }
    });

Calls to this pseudo-constructor return an idle object from the pool or a newly
created object. The `create` and `reset` functions are called with the object as
(like a constructor function), and are passed all arguments given to the
pseudo-contructor.

    var thing = Thing(0, 1, 2);

Pooled objects are useful for controlling garbage collection.
Garbage cannot be collected until all references to pseudo-constructor are
released.
