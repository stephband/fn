
import { getTarget } from './observer.js';
import Observable from './observable.js';

//const DEBUG = window.DEBUG === true;
const assign = Object.assign;

/** 
mutations(paths, target)

Returns a stream of mutations, where an emitted mutation is a grouped and
asynchronous, in order that we know in synchronous code that the whole target 
has been mutated each time the consumer fn is called.

```
mutations('name label', object)
.each((keys) => {
    console.log('Mutated keys', keys);
});
```
**/

function push(paths, path, promise, trigger) {
    // Where paths has no pending mutations, light up a promise
    if (!paths.length) {
        promise.then(trigger);
    }

    // Then collect mutated names
    if (!paths.includes(path)) {
        paths.push(path);
    }
}

function start(paths, target, consumer) {
    const promise = Promise.resolve(paths);

    function trigger() {
        // Paths is only available synchronously inside consumer()
        consumer(paths);
        paths.length = 0;
    }

    const observables = paths.map((path) => new Observable(path, target));
    paths.length = 0;
    observables.forEach((observable) => observable.each(
        (value) => push(paths, observable.path, promise, trigger)
    ));

    return observables;
}

function stop(stream) {
    stream.stop();
}

function Mutations(paths, target) {
    // Clone paths, were going to mess with it
    this.paths  = paths;
    this.target = target;
}

assign(Mutations.prototype, {
    each: function(fn) {
        this.children = start(this.paths, this.target, fn);
        return this;
    },

    stop: function() {
        this.children.forEach(stop);
        return this;
    }
});

export default function mutations(paths, object) {
    // Turn a string into an array of paths or duplicate an array
    paths = typeof paths === 'string' ?
        paths.split(/\s+/) :
        paths.slice() ;

    return new Mutations(paths, getTarget(object));
}
