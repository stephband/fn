# Fn

A library of functional functions.


### Functional functions






### Types


### Objects

Curried functions that operate on objects and maps.



### Lists

Curried functions that operate on arrays and array-like objects such as
`arguments`. Many delegate to using a method of the same name if the object
has one, so they can also be used points-free style on functors and streams.

<template data-module="fn concat(array2, array1)">

Concatenates `list2` to `list1`. More robust than Array#concat as it handles
arrays, array-like objects, functors and streams.
</template>
<template data-module="fn contains(object, array)"></template>
<template data-module="fn each(fn, array)"></template>
<template data-module="fn filter(fn, array)"></template>
<template data-module="fn find(fn, array)"></template>
<template data-module="fn insert(fn, array, value)"></template>
<template data-module="fn last(array)">

Picks the last value from an array or array-like object.
</template>
<template data-module="fn latest(stream)">

Consumes an array, functor or stream and returns the latest value.
</template>
<template data-module="fn map(fn, array)"></template>
<template data-module="fn reduce(fn, seed, array)"></template>
<template data-module="fn remove(array, object)"></template>
<template data-module="fn rest(i, array)">

Returns values indexed `i` and above from `array`.
</template>
<template data-module="fn sort(fn, array)"></template>
<template data-module="fn split(fn, array)"></template>
<template data-module="fn take(i)">

Returns values up to index `i` from `array`.
</template>
<template data-module="fn diff(array1, array2)"></template>
<template data-module="fn intersect(array1, array2)"></template>
<template data-module="fn unite(array1, array2)"></template>
<template data-module="fn unique(array)"></template>

<!--
<template data-module="fn by(key, a, b)">
<template data-module="fn byGreater(a, b)">
<template data-module="fn byAlphabet(a, b)">
-->

### Numbers




### Strings




### Time



## Fn()

Create a functor: a lazy, mappable, readable list of values with chainable
methods. A functor is a fantasy-land compliant Functor, Applicative and Monad.

<template data-module="fn Fn(fn)">

Creates a functor from a function or generator:

	// An infinite functor of `1`s
    var unity = Fn(function() { return 1; });

Values are extracted from a functor with `.shift()`:

    f.shift() // 1
    f.shift() // 1
    ...
</template>
<template data-module="fn Fn.of(value, ...)">

Creates a functor from arguments.

    var f1 = Fn.of(0, 1, 2, 3);
</template>
<template data-module="fn Fn.from(array)">

Creates a functor from an array or collection.

    var f2 = Fn.from([0, 1, 2, 3]);
</template>
#### Transform

<template data-module="fn ap(object)"></template>
<template data-module="fn chain(fn)"></template>
<template data-module="fn chunk(n)">

Splits values into functors of length `n`.
</template>
<template data-module="fn clone()"></template>
<template data-module="fn concat(list)"></template>
<template data-module="fn dedup()"></template>
<template data-module="fn filter(fn)"></template>
<template data-module="fn first()"></template>
<template data-module="fn fold(fn, seed)"></template>
<template data-module="fn join()"></template>
<template data-module="fn latest()"></template>
<template data-module="fn map(fn)"></template>
<template data-module="fn partition(fn)">

Splits values into streams, where all values in a stream share the return
value of `fn(value)`.
</template>
<template data-module="fn split(fn)">

Splits values into functors, where a new functor is created whenever the
predicate `fn(value)` returns true.
</template>
<template data-module="fn take(i)"></template>
<template data-module="fn rest(i)"></template>
<template data-module="fn unique()"></template>

#### Input

<template data-module="fn buffer()"></template>

<!--Give the functor an `.unshift()` method, creating an entry point for
unshifting values back into the flow.-->

#### Consume

<template data-module="fn catch(fn)">

Catch errors. The callback is passed the error object, and it's return value
is passed to the flow of values.
</template>
<template data-module="fn each(fn)"></template>
<template data-module="fn find(fn)"></template>
<template data-module="fn next()"></template>
<template data-module="fn pipe(stream)"></template>
<template data-module="fn reduce(fn, seed)"></template>
<template data-module="fn shift()"></template>
<template data-module="fn tap(fn)"></template>
<template data-module="fn toArray()"></template>
<template data-module="fn toJSON()"></template>
<template data-module="fn toString()"></template>

## Stream()

Streams are pushable, observable functors. Streams inherit all methods of a
functor, plus they also get a `.push` method and are observed for `"push"` and
`"pull"` events.

<template data-module="fn Stream(setup)">

Creates a stream.

    var stream = Stream(function setup() {
		var buffer = [0,1,2,3];
		return buffer;
    });
</template>
<template data-module="fn Stream.of(value1, value2, ...)">

Create a buffer stream of values.
</template>
<template data-module="fn Stream.from(array)">

Create a buffer stream from an array or collection.
</template>
#### Transform

<template data-module="fn ap(object)"></template>
<template data-module="fn chain(fn)"></template>
<template data-module="fn chunk(n)"></template>
<template data-module="fn concat(source)"></template>
<template data-module="fn combine(fn, source1, source2, ...)">

Takes any number of streams and combines their latest values into one stream
by passing them through the combinator function `fn`. The combinator should
be able to accept the same number of arguments as the number of streams
(including the current stream).
</template>
<template data-module="fn dedup()"></template>
<template data-module="fn filter(fn)"></template>
<template data-module="fn first()"></template>
<template data-module="fn fold(fn, seed)"></template>
<template data-module="fn join()"></template>
<template data-module="fn latest()"></template>
<template data-module="fn map(fn)"></template>
<template data-module="fn merge(source1, source2, ...)"></template>
<template data-module="fn partition(fn)"></template>
<template data-module="fn take(i)"></template>
<template data-module="fn rest(i)"></template>
<template data-module="fn unique()"></template>

<template data-module="fn choke(time)"></template>
<template data-module="fn clock(options)"></template>
<template data-module="fn throttle(options)"></template>

#### Input

<template data-module="fn push(value, ...)"></template>

#### Consume

<template data-module="fn catch(fn)">

Catch errors. The callback is passed the error object, and it's return value
is passed into the stream.
</template>
<template data-module="fn each(fn)"></template>
<template data-module="fn find(fn)"></template>
<template data-module="fn next()"></template>
<template data-module="fn pipe(stream)"></template>
<template data-module="fn reduce(fn, seed)"></template>
<template data-module="fn shift()"></template>
<template data-module="fn toArray()"></template>
<template data-module="fn toJSON()"></template>
<template data-module="fn toString()"></template>

//<template data-module="fn buffer(value, ...)">
//
//<!--Give the functor an `.unshift()` method, creating an entry point for unshifting
//values back into the flow.-->

#### Control

<template data-module="fn on(fn)"></template>
<template data-module="fn off(n)"></template>
<template data-module="fn stop()"></template>
<template data-module="fn then(fn)"></template>

## Constructors

<template data-module="fn Stream.Combine(fn, source1, source2, ...)">

Takes any number of streams and combines their latest values into one stream
by passing them through the combinator function `fn`. The combinator should
be able to accept the same number of arguments as the number of streams.
</template>
<template data-module="fn Stream.Merge(source1, source2, ...)">

Takes any number of streams and combines their latest values into one stream
by merging them temporally: that is, values are emitted in the order they are
pushed to their respective source streams.
</template>
<template data-module="fn Stream.Choke()">

Create a stream that chokes the flow of values to flow one per frame, where
a frame is a browser animation frame.
</template>
<template data-module="fn Stream.throttle()">

Create a stream that throttles the flow of values to the latest value per frame,
where a frame is a browser animation frame.
</template>
<template data-module="fn Stream.clock()">

Create a stream that emits values at constant intervals.
</template>

# Observable

#### `Observable(object)`

Returns an observable proxy of <code>object</code>.

    var observable = Observable({a: 0});

Objects accessed on this proxy (and anything in it's
sub-tree) are automatically returned as observable proxies.
Mutations made to this proxy (and anything in it's sub-tree)
cause relevant observers to fire.

#### `observe(observable, path, fn)`

Observes changes to <code>path</code> and calls `fn` when mutations are
detected.

    var unobserve = observe(observable, 'a[b="1"]', fn);

Returns a function that unbinds the observer.

    unobserve();


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
