# Fn

A library of functional functions.

<hr/>

##### `noop()`
##### `id(object)`
##### `curry(fn)`
##### `compose(fn1, fn2)`
##### `pipe(fn1, fn2, ...)`

<hr/>

##### `is(source, object)`
##### `isDefined(object)`
##### `equals(source, object)`
##### `assign(source, object)`
##### `get(path, object)`
##### `set(path, object)`
##### `call(fn)`
##### `of(value, ...)`
##### `map(fn, object)`
##### `apply(arguments, fn)`
##### `invoke(name, object)`
##### `throttle([time,] fn)`
##### `concat(array1, object)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `reduce(fn, initial, object)`
##### `slice(n, m, object)`
##### `sort(fn, object)`
##### `by(name, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`
##### `add(n, m)`
##### `multiply(n, m)`
##### `pow(n, m)`
##### `mod(n, m)`
##### `normalise(min, max, value)`
##### `denormalise(min, max, value)`
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

## Functor(fn)

Functor is a wrapper for a function that returns a value - in other words, it is an IO Functor. Functor has fantasy-land compliant methods for Functor, Applicative and Monad. Values can be extracted at the end of the chain with `.shift()`.

    var f = Functor(function() { return 6; })

    f.shift() // 6
    f.shift() // 6
    ...

#### Create

##### `Functor(fn)`
##### `Functor.of(value, ...)`
##### `of(value, ...)`

#### Transform

##### `ap(object)`
##### `map(fn)`
##### `filter(fn)`
##### `join(fn)`
##### `chain(fn)`
##### `map(fn)`
##### `sort(fn)`
##### `head()`
##### `tail()`
##### `slice(n, m)`
##### `unique(fn)`
##### `scan(fn, value)`
##### `assign(object)`
##### `parse()`
##### 'stringify()'

<!--
##### `split(fn)`
##### `batch(n)`
##### `group(fn)`
-->
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

Streams are pushable, observable Functors. Streams inherit all input, transform and output methods from Functor, plus they also get a `.push` method and are observed for `"push"` and `"pull"` events with `.on(type, fn)`.

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

#### Input

##### `Stream(setup)`
##### `Stream.of(value, ...)`
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
