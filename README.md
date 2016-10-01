# Fn

A library of functional functions.

### Functional functions

##### `noop()`
##### `id(object)`
##### `cache(fn)`

`var fn2 = cache(fn1);`

Caches the results of calls to `fn2(value)`.

##### `curry(fn)`
##### `compose(fn2, fn1)`
##### `pipe(fn1, fn2, ...)`

### Curried functions

##### `is(a, b)`

Test for referential equality.

##### `equals(a, b)`

Test recursively for deep equality.

##### `isDefined(object)`

Test returns `false` if `object` is `null` or `undefined`.

##### `get(key, object)`

Gets property `key` of `object`, where `object` is a Map, WeakMap, Array or Object.

##### `set(key, value, object)`

Sets property `key` of `object`, where `object` is a Map, WeakMap, Array or Object.

##### `assign(source, object)`

Sets keys of `source` on `object`.

##### `call(fn)`
##### `apply(arguments, fn)`
##### `map(fn, object)`

Delegates to `object.map` or applies `Array.prototype.map` to `object`.

##### `invoke(name, object)`

Invokes method `name` of `object`.

##### `throttle([time,] fn)`
##### `concat(array1, object)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `reduce(fn, value, object)`
##### `slice(n, m, object)`
##### `sort(fn, object)`
##### `by(key, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`
##### `add(a, b)`
##### `multiply(a, b)`
##### `pow(a, b)`
##### `mod(a, b)`
##### `normalise(min, max, n)`

Normalises `n` from range `min`-`max` to range 0-1.

##### `denormalise(min, max, n)`

Denormalises `n` from range 0-1 to range `min`-`max`.

##### `toFixed(n, value)`
##### `not(object)`
##### `match(regex, string)`
##### `exec(regex, string)`
##### `slugify(string)`
##### `toType(object)`
##### `toClass(object)`
##### `toStringType(string)`

    Fn.stringTypeOf('http://cruncher.ch');  // 'url'
    Fn.stringTypeOf('hello@cruncher.ch');   // 'email'
    Fn.stringTypeOf('42');                  // 'int'
    Fn.stringTypeOf('41.5');                // 'float'
    Fn.stringTypeOf('{}');                  // 'json'
    Fn.stringTypeOf('...');                 // 'string'

## Fn(fn)

Fn creates a wrapper for a function that returns a value - in other words,
it creates an IO Functor. The functor has fantasy-land compliant methods for
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

##### `of(value, ...)`

#### Transform

##### `ap(object)`
##### `map(fn)`
##### `filter(fn)`
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
##### `assign(object)`
##### `parse()`
##### 'stringify()'

#### Output

##### `each(fn)`
##### `find(fn)`
##### `pipe(stream)`
##### `reduce(fn, value)`
##### `shift()`
##### `tap()`
##### `toArray()`
##### `toFunction()`

## Stream(setup)

Streams are pushable, observable Functors. Streams inherit all input, transform
and output methods from `Fn.prototype`, plus they also get a `.push` method and
are observed for `"push"` and `"pull"` events with `.on(type, fn)`.

    var stream = Fn.Stream(function setup(notify) {
        return {
            next: function() {...},
            push: function() {...}
        };
    });

    stream.on('pull', function() {
        // Write to stream
        stream.push(0);
    });

##### `Stream.of(value1, value2, ...)`

Create a buffered stream of values.

#### Input

##### `of(value, ...)`
##### `on(type, fn)`
##### `push(value, ...)`

#### Transform

##### `split(fn)`
##### `batch(n)`
##### `group(fn)`
##### `delay(time)`
##### `throttle(time, fn)`

#### Output

##### `toPromise()`
