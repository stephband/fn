# Fn

A library of functional functions.

## Fn()

Construct a generator with chainable methods. Make a generator from an array:

    var f = Fn(array);

Or a generator that transforms another generator:

	var f = Fn(generator, transform);

Or a generator described by next() and push() functions. The push function is optional.

    var f = Fn(next, push);

#### .head()
#### .tail()
#### .slice()
#### .map()
#### .find()
#### .filter()
#### .reduce()
#### .sort()
#### .unique()
#### .batch()
#### .group()
#### .flatten()
#### .each()
#### .add()
#### .subtract()
#### .multiply()
#### .divide()
#### .mod()
#### .pow()
#### .log10()
#### .normalise()
#### .denormalise()
#### .rangeLog()
#### .rangeLogInv()
#### .dB()
#### .decimals()
#### .type()
#### .int()
#### .float()
#### .boolean()
#### .stringify()
#### .jsonify()
#### .parsejson()
#### .slugify()
#### .uppercase()
#### .lowercase()
#### .matches()
#### .regex()
#### .get()
#### .set()
#### .assign()
#### .done()
#### .push()
#### .fn()
#### .toFunction()
#### .toArray()

## Fn

A library of functional and curried functions.

### Functional functions

#### .noop()
#### .identity()
#### .curry()
#### .compose()
#### .pipe()

### Curried functions

#### .concat()
#### .each()
#### .filter()
#### .indexOf()
#### .map()
#### .reduce()
#### .slice()
#### .sort()
#### .equal()
#### .compare()
#### .get()
#### .set()
#### .assign()
#### .keys()
#### .call()
#### .apply()
#### .add()
#### .subtract()
#### .multiply()
#### .divide()
#### .pow()
#### .normalise()
#### .denormalise()
#### .rangeLog()
#### .rangeLogInv()
#### .toFixed()
#### .match()
#### .regexp()
#### .slugify()
#### .not()

### Constructors

#### .Generator()
#### .ArrayGenerator()
#### .MapGenerator()
