
const DEBUG  = false;//window.DEBUG && window.DEBUG.signal !== false;
const assign = Object.assign;

let evaluatingSignal;
let hasInvalidDependency;
let id = 0;


function removeInput(signal, input) {
    // Remove input from stream
    let i = 0;
    while (signal[--i] && signal[i] !== input);
    while (signal[i--]) signal[i + 1] = signal[i];
}

function removeOutput(signal, output) {
    // Remove output from signal
    let o = -1;
    while (signal[++o] && signal[o] !== output);
    while (signal[o++]) signal[o - 1] = signal[o];
}

function setDependency(signal, dependent) {
    // Set signal as an input of dependent
    let n = 0;
    while (dependent[--n]) if (dependent[n] === signal) break;
    dependent[n] = signal;

    // Set dependent as an output of signal
    n = -1;
    while (signal[++n]) if (signal[n] === dependent) break;
    signal[n] = dependent;

    if (DEBUG) console.log(
        '%cSignal%c connect%c ' + signal.constructor.name + '#' + signal.id + ' - ' + dependent.constructor.name + '#' + dependent.id,
        'color: #718893; font-weight: 300;',
        'color: #3896BF; font-weight: 300;',
        'color: #718893; font-weight: 300;'
    );
}

function invalidateDependents(signal) {
    if (DEBUG) {
        console.log(
            '%cSignal%c invalidate%c ' + signal.constructor.name + '#' + signal.id + (signal.name ? ' "' + signal.name + '"' : ''),
            'color: #718893; font-weight: 300;',
            'color: #3896BF; font-weight: 300;',
            'color: #718893; font-weight: 300;'
        );
    }

    let n = -1;
    let dependent;
    while (dependent = signal[++n]) {
        signal[n] = undefined;
        dependent.invalidate(signal);
    }
}

export function hasInput(signal, input) {
    // Check if input exists in the -ve indexes
    let n = 0;
    while (signal[--n]) if (signal[n] === input) return true;
}


/**
Signal

A signal is an object that represents a value that may change. A signal has
essentially one property, `.value`. A state signal can have its `.value`
written, a compute signal's `.value` may only be read.

The `Signal` constructor is not called directly, but calling `Signal.of(value)`
creates a state signal, and `Signal.from(fn)` creates a compute signal.
**/

export default class Signal {
    /**
    Signal.isSignal(object)

    Returns `true` where `object` is an instance of `Signal`.

    This guarantees that `object` has a gettable `value` property. This is not
    true of an Observer, which is not really a signal at all – it cannot
    have dependencies – but is only evaluated as one when invalidated.
    **/

    static isSignal(object) {
        return object instanceof Signal;
    }

    /**
    Signal.of()
    Signal.of(value)

    Creates a state signal that has essentially one property, `.value`.
    When `.value` is set the signal becomes invalid, stale, out of date,
    irrelevant, historic, old, and any signals that depend on it are invalidated.
    **/

    static of(value) {
        return new ValueSignal(value);
    }

    /**
    Signal.from(fn)
    Signal.from(promise)
    Signal.from(stream)

    Creates a compute signal from a function, where `fn` computes a value by
    reading other signals' values. This signal is then invalidated when any of
    the read signals are invalidated.

    Creates a state signal from a promise or stream that invalidates
    dependencies as the promise or streams' values resolve.
    **/

    static from(fn, context) {
        // Promise
        if (fn.then) {
            const signal = Signal.of();
            fn.then((value) => signal.value = value);
            return signal;
        }

        // Pipeable
        if (fn.pipe) {
            return fn.pipe(new PushSignal());
        }

        // Function
        return new ComputeSignal(fn, context);
    }

    static compute(fn, context) {
        return new ComputeSignal(fn, context);
    }

    static fromProperty(name, object) {
        // Function
        return new PropertySignal(name, object);
    }

    /**
    Signal.frame(fn, initial)
    Returns an observe signal, a form of compute signal that calls `fn` once
    immediately, and then on every animation frame following the invalidation
    of any signal read during the execution of `fn`.
    **/

    static frame(fn) {
        // Add to signals called on invalidation
        return new FrameObserver(fn);
    }

    /**
    Signal.tick(fn, initial)
    Returns an observe signal, a form of compute signal that calls `fn` once
    immediately, and then on every tick following the invalidation of any signal
    read during the execution of `fn`.
    **/

    static tick(fn) {
        // Add to signals called on invalidation
        return new TickObserver(fn);
    }

    /**
    Signal.observe(signal, fn)
    Calls `fn` on the next tick after `signal` changes.
    **/
/*
    static observe(signal, fn) {
        return new ObserveSignal(signal, fn);
    }
*/
    static timed(name, object) {
        return new TimedSignal(name, object);
    }

    /**
    Signal.evaluate(object, fn[, context])

    A function for building objects that behave as compute or observe signals.

    Evaluates `object` as a signal by applying it to `fn` and returning the
    result. Signals read during `fn()` have `object` registered as a dependent,
    so `object.invalidate()` is called when any of those signals are invalidated.
    It's the same function as that used internally to evaluate signals.

    Typically `object.invalidate()` would cue a `Signal.evaluate(object, fn)` at
    some point in the future. (It is ill-advised to `Signal.evaluate(object, fn)`
    synchronously inside `.invalidate()`, although this should only lead to
    wasted cycles, not bad results... errm, in most cases, at least.)
    **/

    static evaluate(signal, fn, context = signal) {
        // Make signal the evaluating signal for the duration of this
        // synchronous evaluation of fn()
        const previous = evaluatingSignal;
        evaluatingSignal = signal;

        // Clear the decks
        if (!previous) hasInvalidDependency = false;

        /*if (window.DEBUG && window.DEBUG.signal !== false) console.group(
            '%cSignal%c evaluate%c ' + evaluatingSignal.constructor.name + '#' + evaluatingSignal.id + (evaluatingSignal.name ? ' "' + evaluatingSignal.name + '"' : ''),
            'color: #718893; font-weight: 300;',
            'color: #3896BF; font-weight: 300;',
            'color: #718893; font-weight: 300;'
        );*/

        const value = fn.apply(context);

        /*if (window.DEBUG && window.DEBUG.signal !== false) console.groupEnd();*/

        evaluatingSignal = previous;
        return value;
    }

    static get hasInvalidDependency() {
        return hasInvalidDependency;
    }

    /*
    Signal.evaluating
    The signal that is currently being evaluated, or undefined. This is exposed
    so that Data() can make a better call about when to create signals (if there
    is no evaluating signal, it needn't make a signal when a property is
    accessed). Deliberately undocumented.
    */

    static get evaluating() {
        return evaluatingSignal;
    }

    constructor(name) {
        if (name) this.name = name;

        if (DEBUG) {
            this.id = ++id;
            console.log(
                '%cSignal%c create%c ' + this.constructor.name + '#' + this.id + (this.name ? ' "' + this.name + '"' : ''),
                'color: #718893; font-weight: 300;',
                'color: #3896BF; font-weight: 300;',
                'color: #718893; font-weight: 300;'
            );
        }
    }

    /**
    .valueOf()

    Enables direct use in some expressions like addition or string concatenation.
    This may prove to be less useful than we think. For one thing, logging a
    signal object now evaluates it, affecting the outcome.
    **/

    valueOf() {
        return this.value;
    }

    /*
    .toString()
    .toJSON()

    Treat `.value` as the value to output?
    */

    toString() {
        return this.value + '' ;
    }

    toJSON() {
        return this.value;
    }
}


/*
ValueSignal(value)
*/

class ValueSignal extends Signal {
    #value;

    constructor(value) {
        super();
        this.#value = value;
    }

    /**
    .value

    Getting `.value` gets value from the cache.

    Setting `.value`, assuming the newly set value differs from the previous
    value, updates the cache and invalidates dependent signals.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #value
        if (evaluatingSignal) setDependency(this, evaluatingSignal);
        return this.#value;
    }

    set value(value) {
        // Don't update for no change in value
        if(this.#value === value) return;

        // Set cached value
        this.#value = value;

        // Invalidate dependents. If a dependent updates synchronously here
        // we may be in trouble but #valid is true and #value is set so
        // that's ok I think?
        invalidateDependents(this);
    }
}


/*
PushSignal(value)
An consumer interface that allows you to terminate a Stream in a signal.

```js
Stream.of(1).pipe(new PushSignal())
```
*/

class PushSignal extends Signal {
    #value;

    constructor(value) {
        super();
        this.#value = value;
    }

    /**
    .value
    Getting `.value` gets value from the cache.
    **/
    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #value
        if (evaluatingSignal) setDependency(this, evaluatingSignal);
        return this.#value;
    }

    /**
    .push(value)
    Updates the cache with `value` and invalidates dependent signals.
    **/
    push(value) {
        // Don't update for no change in value
        if(this.#value === value) return;

        // Set cached value
        this.#value = value;

        // Invalidate dependents.
        invalidateDependents(this);
    }
}


/*
PropertySignal(value)
Wraps a property in a signal. TODO: is this really needed?
*/

class PropertySignal extends Signal {
    // Privates
    #valid;
    #value;

    constructor(name, object) {
        super(name);
        this.object = object;
    }

    evaluate() {
        return this.object[this.name];
    }

    /**
    .value
    Getting `.value` gets a cached value or, if the signal is invalid,
    evaluates (and caches) value from `fn()`. During evaluation this signal is
    registered as dependent on other signals whose value is got.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #value
        if (evaluatingSignal) setDependency(this, evaluatingSignal);
        if (this.#valid) return this.#value;
        this.#value = Signal.evaluate(this, this.evaluate, this);
        if (!hasInvalidDependency) this.#valid = true;
        return this.#value;
    }

    set value(value) {
        // Don't update for no change in value.
        if(this.#value === value) return;

        const { object, name } = this;

        // Set value on object and update value from object in case target is
        // doing something funky with property descriptors that return a
        // different value from the value set.
        object[name] = value;
        value = object[name];

        // Don't invalidate for no change in value.
        if(this.#value === value) return;

        // Set cache by reading value back off the object in case object is
        // doing something funky with property descriptors that return a
        // different value from the value that was set. Rare, but it can happen.
        this.#value = value;

        // Invalidate dependents. If a dependent updates synchronously here
        // we may be in trouble but #valid is true and #value is set so
        // that's ok I think?
        invalidateDependents(this);
    }

    /*
    .invalidate(signal)
    Invalidates this signal and calls `.invalidate(this)` on all dependent
    signals. The `signal` parameter is the signal causing the invalidation; it
    may be `undefined`: where it exists it is verified as a current input of
    this before this is invalidated.
    */

    invalidate(signal) {
        if (!this.#valid) return;

        // Verify that signal has the right to invalidate this to protect us
        // against the case where a dependent is left on another signal due to
        // an old evaluation
        if (signal && !hasInput(this, signal)) return;

        this.#valid = false;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Invalidate dependents. If a dependent updates synchronously here
        // we may be in trouble, as it would evaluate and cache this signal
        // and overwrite dependents before we have finished invalidating
        // this set of dependents.
        invalidateDependents(this);
    }
}


/*
ComputeSignal(value)
*/

class ComputeSignal extends Signal {
    // Privates
    #fn;
    #context;
    #valid;
    #value;

    constructor(fn, context) {
        super();
        this.#fn      = fn;
        this.#context = context;
    }

    /**
    .value
    Getting `.value` gets a cached value or, if the signal is invalid,
    evaluates (and caches) value from `fn()`. During evaluation this signal is
    registered as dependent on other signals whose value is got.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #value
        if (evaluatingSignal) setDependency(this, evaluatingSignal);
        if (this.#valid) return this.#value;
        this.#value = Signal.evaluate(this, this.#fn, this.#context);
        if (!hasInvalidDependency) this.#valid = true;
        return this.#value;
    }

    /*
    .invalidate(signal)
    Invalidates this signal and calls `.invalidate(this)` on all dependent
    signals. The `signal` parameter is the signal causing the invalidation; it
    may be `undefined`: where it exists it is verified as a current input of
    this before this is invalidated.
    */

    invalidate(signal) {
        if (!this.#valid) return;

        // Verify that signal has the right to invalidate this to protect us
        // against the case where a dependent is left on another signal due to
        // an old evaluation
        if (signal && !hasInput(this, signal)) return;

        this.#valid = false;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Invalidate dependents. If a dependent updates synchronously here
        // we may be in trouble, as it would evaluate and cache this signal
        // and overwrite dependents before we have finished invalidating
        // this set of dependents.
        invalidateDependents(this);
    }
}


/**
TimedSignal(name, object)
A signal that wraps an AudioParam and remains invalid until a specified time in
the future. This ensures that any FrameObserver signals that depend on it keep
rendering until automation completes.
**/

export class TimedSignal extends Signal {
    #validTime = 0;

    constructor(name, object) {
        super(name);
        this.object = object;
    }

    getTime() {
        return window.performance.now();
    }

    evaluate() {
        return this.object[this.name];
    }

    /**
    .value
    Getting `.value` gets the object's value. If there's an evaluating signal,
    it becomes dependent on this ParamSignal. The signal remains invalid until
    the `.getTime()` reaches `.invalidateUntil(time)` time.
    **/
    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal
        if (Signal.evaluating) {
            setDependency(this, evaluatingSignal);

            // This is a timed signal, therefore may remain invalid following an
            // evaluation. We can't invalidate the graph while evaluating, but
            // the invalid state must prevent dependents from becoming valid...
            // ...so set a flag marking the current evaluation as invalid
            if (this.getTime() < this.#validTime) hasInvalidDependency = true;
        }

        // Get the current value from the audio param
        return this.evaluate();
    }

    // DEPRECATE
    set value(value) {
        // Don't update for no change in value.
        if(this.object[this.name] === value) return;

        // Update value and invalidate until now
        this.object[this.name] = value;
        invalidateUntil(this.getTime());
    }

    /**
    .invalidateUntil(time)
    Sets a time at which this signal becomes valid. Until this time is reached
    the signal remains invalid, causing dependent observer signals to keep
    observing.
    **/
    invalidateUntil(time) {
        // Don't do anything if the #validTime isn't changing ... Hmmm ... see
        // below. I think this condition suffers the same problem.
        //if (time === this.#validTime) return;

        const currentTime = this.getTime();
        const isValid     = currentTime >= this.#validTime;

        // Update the #validTime
        this.#validTime = time;

        // If we are moving into a valid state do nothing ... Hmmmmmm ...
        // This condition interferes with being able to invalidate a time in the
        // past, which we may want to do for example for latency compensation.
        // If we are calling .invalidateUntil(), I think we can assume something
        // has changed and we need to invalidate unless we were already invalid.
        //if (currentTime > time) return;

        // If we are moving out of a valid state invalid dependents
        if (isValid) invalidateDependents(this);
    }
}


/*
ObserveSignal(signal, fn)
*/
/*
export class ObserveSignal {
    constructor(signal, fn) {
        this.signal = signal;
        this.fn = () => fn(Signal.evaluate(this, this.evaluate, this));
        this.fn();
    }

    evaluate() {
        this.promise = undefined;
        return this.signal.value;
    }

    invalidate(input) {
        // If the observer is already cued do nothing
        if (this.promise) return;

        // Verify that input signal has the right to invalidate this
        if (input && !hasInput(this, input)) return;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Evaluate and send value to consumer on next tick
        this.promise = promise.then(this.fn);
    }

    stop() {
        // Remove this from signal graph
        let n = 0, input;
        while (input = this[--n]) {
            let m = -1;
            removeOutput(input, this);
            this[n] = undefined;
        }

        return this;
    }
}
*/



/*
Observer(evaluate)
An Observer is a signal that calls `evaluate` on construction and again on every
cue following an invalidation of any signal read by `evaluate`. Internal only,
sub-classed by `TickObserver` and `FrameObserver`.
*/

class Observer {
    constructor(fn) {
        if (DEBUG) {
            this.id = ++id;
            console.log(
                '%cSignal%c create%c ' + this.constructor.name + '#' + this.id + (this.name ? ' "' + this.name + '"' : ''),
                'color: #718893; font-weight: 300;',
                'color: #3896BF; font-weight: 300;',
                'color: #718893; font-weight: 300;'
            );
        }

        // If no fn passed in we do not want to evaluate the signal immediately.
        // This provides for a sub-class to define .evaluate() and launch it
        // when it likes, as in Literal's Renderer.
        if (!fn) return;

        // Set fn as evaluation function
        this.evaluate = fn;

        // Check we are not currently evaluating
        if (evaluatingSignal) {
            // Make recovery possible? I'm not convinced this works in all cases
            // but it works where an observer is instantiated inside an observer
            evaluatingSignal = undefined;
            throw new Error('Illegal nested ' + this.constructor.name + ' – cannot instantiate observer during signal evaluation');
        }

        // An initial, synchronous evaluation binds this observer to changes
        if (Signal.evaluate(this, this.evaluate) || hasInvalidDependency) this.cue();
    }

    invalidate(input) {
        // Static observers list
        const observers = this.constructor.observers;

        // If the observer is already cued do nothing
        if (observers.indexOf(this) !== -1) return;

        // Verify that input signal has the right to invalidate this
        if (input && !hasInput(this, input)) return;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        this.cue();
    }

    stop() {
        // Remove this from signal graph
        let n = 0, input;
        while (input = this[--n]) {
            let m = -1;
            removeOutput(input, this);
            this[n] = undefined;
        }

        // Remove from observers if cued
        const observers = this.constructor.observers;
        const i = observers.indexOf(this);
        if (i !== -1) observers.splice(i, 1);
        return this;
    }
}


/*
TickObserver
A TickObserver is a signal that calls `fn` on construction and again on every
tick following an invalidation of any signal read by `fn`. Use `Signal.tick(fn)`.
*/

const promise = Promise.resolve();

function render(observers) {
    let n = -1, signal;

    while (signal = observers[++n]) {
        // Evaluate the signal, if it returns false-y, and nothing has flagged
        // it as having invalid dependencies...
        if (!Signal.evaluate(signal, signal.evaluate) && !hasInvalidDependency) {
            // ...remove the signal from observers and decrement n
            observers.splice(n--, 1);
        }
    }

    return observers;
}

function tick() {
    const observers = render(TickObserver.observers);

    // Where observers remain schedule the next frame
    if (observers.length) promise.then(tick);
}

export class TickObserver extends Observer {
    static observers = [];

    cue() {
        const observers = TickObserver.observers;

        // If no observers are cued, cue tick() on the next tick
        if (!observers.length) promise.then(tick);

        // Add this observer to observers
        observers.push(this);
    }
}


/*
FrameObserver

A FrameObserver is an observer signal that calls `fn` on construction and again
on every animation frame following an invalidation of any signal read by `fn`.
Additionally where the return value of `fn()` is truthy the signal remains
active and will evaluate on following frames until `fn()` is false-y.

Use `Signal.frame(fn)` to create a FrameObserver signal.
*/

function frame() {
    const observers = render(FrameObserver.observers);

    // Where observers remain schedule the next frame
    if (observers.length) requestAnimationFrame(frame);
}

export class FrameObserver extends Observer {
    // Exposed for Literal's renderer
    static observers = [];

    cue() {
        const observers = this.constructor.observers;

        // If no observers are cued, cue frame() on the next frame
        if (!observers.length) window.requestAnimationFrame(frame);

        // Add this observer to observers
        observers.push(this);
    }
}
