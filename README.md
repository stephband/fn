# Fn

A library of functional functions.

<hr/>

##### `noop()`
##### `id(object)`
##### `curry(fn)`
##### `compose(fn1, fn2)`
##### `pipe(fn1, fn2, ...)`

<hr/>

##### `isDefined(object)`
##### `typeOf(object)`
##### `classOf(object)`
##### `stringTypeOf(string)`
##### `is(source, object)`
##### `equals(source, object)`
##### `assign(source, object)`
##### `get(path, object)`
##### `set(path, object)`
##### `call(fn)`
##### `apply(arguments, fn)`
##### `invoke(name, object)`
##### `throttle([time,] fn)`
##### `concat(array1, object)`
##### `each(fn, object)`
##### `filter(fn, object)`
##### `map(fn, object)`
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


## Fn.Stream(setup)

    var f = Fn.Stream(function(notify) {
        return {
            next: fn,
            push: fn,
            end:  fn
        };
    });

##### `head()`
##### `tail()`
##### `slice(n, m)`
##### `map(fn)`
##### `find()`
##### `filter(fn)`
##### `reduce(fn, n)`
##### `sort(fn)`
##### `unique()`
##### `batch()`
##### `split()`
##### `group()`
##### `flatten()`
##### `each(fn)`
##### `add(n)`
##### `multiply(n)`
##### `pow(n)`
##### `mod(n)`
##### `normalise(min, max)`
##### `denormalise(min, max)`
##### `boolify()`
##### `stringify()`
##### `jsonify()`
##### `slugify()`
##### `match(regex)`
##### `exec(regex)`
##### `get(path)`
##### `set(path, value)`
##### `assign(source)`
##### `done()`
##### `push(value, ...)`
##### `toFunction()`
##### `toArray()`
