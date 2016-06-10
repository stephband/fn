## Fn

A library of functional functions.

#### `noop()`
#### `identity(object)`
#### `curry(fn)`
#### `compose(fn1, fn2)`
#### `pipe(fn1, fn2, ...)`

### Curried functions

#### `typeOf(object)`
#### `classOf(object)`
#### `is(source, object)`
#### `isDefined(object)`
#### `equals(source, object)`
#### `assign(source, object)`
#### `get(path, object)`
#### `set(path, object)`
#### `invoke(name, object)`
#### `run(fn)`
#### `concat(array1, object)`
#### `each(fn, object)`
#### `filter(fn, object)`
#### `map(fn, object)`
#### `reduce(fn, initial, object)`
#### `slice(n, m, object)`
#### `sort(fn, object)`
#### `by(name, a, b)`
#### `byGreater(a, b)`
#### `byAlphabet(a, b)`
#### `add(n, m)`
#### `multiply(n, m)`
#### `pow(n, m)`
#### `mod(n, m)`
#### `normalise(min, max, value)`
#### `denormalise(min, max, value)`
#### `toFixed(n, value)`
#### `not(object)`
#### `match(regex, string)`
#### `exec(regex, string)`
#### `slugify(string)`

<!--
## Fn()

Construct a generator with chainable methods. Make a generator from an array:

    var f = Fn(array);

Or a generator that transforms another generator:

	var f = Fn(generator, transform);

Or a generator described by next() and push() functions. The push function is optional.

    var f = Fn(next, push);

#### head()
#### tail()
#### slice()
#### map()
#### find()
#### filter()
#### reduce()
#### sort()
#### unique()
#### batch()
#### group()
#### flatten()
#### each()
#### add()
#### subtract()
#### multiply()
#### divide()
#### mod()
#### pow()
#### log10()
#### normalise()
#### denormalise()
#### rangeLog()
#### rangeLogInv()
#### dB()
#### decimals()
#### type()
#### int()
#### float()
#### boolean()
#### stringify()
#### jsonify()
#### slugify()
#### matches()
#### regex()
#### get()
#### set()
#### assign()
#### done()
#### push()
#### fn()
#### toFunction()
#### toArray()
-->
