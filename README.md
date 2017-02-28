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

    fn2(a, b, c)
    fn2(a)(b)(c)
    fn2(a, b)(c)

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

##### `pipe(fn1, fn2, fn3, ...)`

Composes functions into a pipe.
`fn2` is passed the result of `fn1`, `fn3` is passed the result of `fn2` and
so on until the result of the last function is returned.

##### `bind(params, fn)`

    var fn = Fn.bind([0,1,2,3], function() {...})

Returns a function that applies `params` to `fn` when called.
The `this` context inside `fn` is unchanged.


### Types

##### `toType(object)`
##### `toClass(object)`
##### `toArray(object)`
##### `toInt(object)`
##### `toString(object)`


### Objects

##### `equals(a, b)`

Test for deep equality.

##### `is(a, b)`

Test for referential equality.

##### `isDefined(object)`

Test returns `false` if `object` is `null` or `undefined` or `NaN`.

##### `isIn(array, object)`

Test for presence of `object` in `array`.

##### `not(object)`

##### `assign(source, object)`

Copies keys of `source` to `object`.

##### `get(key, object)`

Gets property `key` of `object`, where `object` has a `get` method (eg. Map,
WeakMap) or where `key` is a property of object.

##### `set(key, object, value)`

Sets property `key` of `object`, where `object` has a `set` method (eg. Map,
WeakMap) or where object can have `key` set on it.


### Arrays and collections

##### `concat(array2, array1)`

Concatenates `list2` to `list1`. More robust than Array#concat as it handles
arrays, array-like objects, functors and streams.

##### `diff(array1, array2)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `intersect(array1, array2)`
##### `map(fn, object)`

Delegates to `object.map` or applies `Array.prototype.map` to `object`.

##### `reduce(fn, value, object)`
##### `sort(fn, object)`
##### `unite(array1, array2)`
##### `unique(array)`

##### `invoke(name, object)`

Invokes method `name` of `object`.

##### `throttle([time,] fn)`
##### `by(key, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`

### Numbers

##### `add(a, b)`
##### `multiply(a, b)`
##### `pow(a, b)`
##### `mod(a, b)`
##### `normalise(min, max, n)`

Normalises `n` from range `min`-`max` to range 0-1.

##### `denormalise(min, max, n)`

Denormalises `n` from range 0-1 to range `min`-`max`.

##### `toFixed(n, value)`


### Strings

##### `slugify(string)`
##### `toStringType(string)`

    Fn.toStringType('http://cruncher.ch');  // 'url'
    Fn.toStringType('hello@cruncher.ch');   // 'email'
    Fn.toStringType('42');                  // 'int'
    Fn.toStringType('41.5');                // 'float'
    Fn.toStringType('{}');                  // 'json'
    Fn.toStringType('...');                 // 'string'


## Fn(fn)

Creates an IO Functor. The functor has fantasy-land compliant methods for
Functor, Applicative and Monad. Values can be extracted from a functor
with `.shift()`:

    var f = Functor(function() { return 6; })

    f.shift() // 6
    f.shift() // 6
    ...

A functor is also an iterable:

    f.next().value // 6
    f.next().done  // undefined
    ...

Functors also have the methods:

#### Create

##### `Fn.of(value, ...)`

Create a functor of values.

#### Transform

##### `ap(object)`
##### `map(fn)`
##### `filter(fn)`
##### `reduce(fn, seed)`
##### `join(fn)`
##### `chain(fn)`
##### `sort(fn)`
##### `head()`
##### `tail()`
##### `concat(object)`
##### `batch()`
##### `group(fn)`
##### `slice(n, m)`
##### `unique(fn)`
##### `scan(fn, value)`

#### Output

##### `each(fn)`
##### `find(fn)`
##### `pipe(stream)`
##### `shift()`
##### `tap()`
##### `toString()`
##### `toArray()`

## Fn.Stream(shift, push, stop)

Streams are pushable, observable Functors. Streams inherit all input, transform
and output methods from `Fn.prototype`, plus they also get a `.push` method and
are observed for `"push"` and events with `.on(type, fn)`.

	var i = 0;
    var stream = Fn.Stream(function shift() {
		return ++i;
    });

    stream.each(function(value) {
        if (value > 50) { stream.stop(); }
        ...
    });

##### `Stream.of(value1, value2, ...)`

Create a buffered stream of values.

##### `Stream.observe(property, object)`

Create a stream of changes to the value of an object property.

##### `Stream.choke()`

Create a stream that chokes the flow of values to flow one per frame, where
a frame is a browser animation frame.

##### `Stream.throttle()`

Create a stream that throttles the flow of values to the latest value per frame,
where a frame is a browser animation frame.

##### `Stream.delay(duration)`

Create a stream that delays the flow of pushed values by `duration` seconds.

#### Input

##### `push(value, ...)`

#### Transform

##### `split(fn)`
##### `batch(n)`
##### `group(fn)`
##### `delay(time)`
##### `throttle(time, fn)`

#### Output

##### `toPromise()`

## Fn.Pool(options, prototype)

    var Thing = Fn.pool({
	    create: function() { ... },
        reset:  function() { ... },
        isIdle: function() { ... }
    });

Creates an object pool, such that each call to `Thing(...)` returns an idle
object from the pool, or if there are no idle objects, a newly created
object. Garbage cannot be collected until all references to `Thing` are
released.


## Fn.Throttle(fn, time)

Returns a function that calls fn immediately and thereafter every `time` seconds
while it is called again with new context and arguments.

## Fn.Wait(fn, time)

Returns a function that waits for `time` seconds without being invoked
before calling `fn` using the context and arguments from the latest invocation.

    var wait = Fn.Wait(console.log, 1.5);

	wait(1);
	wait(2);
	wait(3);

	// 1.5 seconds later:
	// > 3
