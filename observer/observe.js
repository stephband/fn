
import { getTarget } from './observer.js';
import Observable    from './observable.js';
import { Combine }   from '../stream/combine.js';


/**
observe(path, target)
Returns an Observable of a dot-notation `path` in `target`, with the methods:

```
.each(fn)
.pipe(pushable)
.stop()
```

May also be called with an `initial` value. Where the value at `path` of `target`
is not strictly equal to `initial`, the consumer will be called (synchronously) 
when attached.

```
observe(path, target, initial)
.each(fn)
```
**/

export default function(path, object, initial) {
    return new Observable(path, getTarget(object), initial);
}

/**
observe(paths, target)
Returns an Observable of a dot-notation `path` in `target`, with the methods:

```
.each(fn)
.pipe(pushable)
.stop()
```

May also be called with an `initial` value. Where the value at `path` of `target`
is not strictly equal to `initial`, the consumer will be called (synchronously) 
when attached.

```
observe(paths, target, initial)
.each(fn)
```
**/

export function observe(paths, object) {
    paths = typeof paths === 'string' ? paths.split(/\s+/) : paths ;

    const target      = getTarget(object);
    const observables = paths.map((path, i) => new Observable(path, target, arguments[i + 2]));

    return observables.length > 1 ?
        new Combine(observables) :
        new Observable(paths, getTarget(object), arguments[0]) ;
}
