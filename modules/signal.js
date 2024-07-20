
import noop from './noop.js';

const DEBUG  = false;//window.DEBUG && window.DEBUG.signal !== false;
const assign = Object.assign;

let evaluatingSignal;
let id = 0;

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
        '%cSignal%c connect%c ' + signal.constructor.name + '[' + signal.id + '] - ' + dependent.constructor.name + '[' + dependent.id + ']',
        'color: #718893; font-weight: 300;',
        'color: #3896BF; font-weight: 300;',
        'color: #718893; font-weight: 300;'
    );
}

function invalidateDependents(signal) {
    let n = -1;
    let dependent;
    while (dependent = signal[++n]) {
        signal[n] = undefined;
        dependent.invalidate(signal);
    }
}

function hasInput(signal, input) {
    // Check if input exists in the -ve indexes
    let n = 0;
    while (signal[--n]) if (signal[n] === input) return true;
    return false;
}


/**
Signal

A signal is an object that represents a value that may change. A signal has
essentially one property, `.value`. A state signal can have its `.value`
written, a compute signal's `.value` may only be read.

The `Signal` constructor is not called directly, but calling `Signal.of(value)`
creates a state signal, and `Signal.from(fn)` creates a compute signal.

TODO: currently if you have 3 signals, a, b and c that is a dependent of a and b,
a may invalidate c, which may evaluate without needing b, ... but c is still set
as an index on b, so it may yet invalidate c unnecessarily.
**/

export default class Signal {
    /**
    Signal.of()
    Signal.of(value)
    Creates a state signal object that has essentially one property, `.value`.
    When `.value` is set the signal becomes invalid, stale, out of date,
    irrelevant, historic, old, and any signals that depend on it are invalidated.
    **/

    static of(value) {
        return new StateSignal(value);
    }

    /**
    Signal.from(fn)
    Creates a compute signal where `fn` computes a value by reading other
    signals' values. This signal is then invalidated when any of the read
    signals are invalidated.
    **/

    static from(fn) {
        // Promise
        if (fn.then) {
            const signal = new StateSignal();
            fn.then((value) => signal.value = value);
            return signal;
        }
        // Pipeable
        else if (fn.pipe) {
            // TODO: make a PushableSignal
            const signal = new StateSignal();
            fn.pipe({ push: (value) => signal.value = value });
            return signal;
        }
        // Function
        else {
            return new ComputeSignal(fn);
        }
    }

    /**
    Signal.observe(signal, fn, initial)
    Returns an observer that calls `fn` with `signal.value` whenever the signal
    is invalidated. If `signal` does not have an initial value equal to `initial`
    `fn` is also called immediately.
    **/

    static observe(signal, fn, initial) {
        // Add to signals called on invalidation
        return new ObserveSignal(signal, fn, initial);
    }

    /**
    Signal.evaluate(object, fn)
    A function for building objects that behave as observer signals.

    Evaluates `object` as a signal by applying it to `fn` and returning the
    result. Signals read during `fn()` have `object` registered as a dependent,
    so `object.invalidate()` is called when any of those signals are invalidated.
    It's the same function as that used internally to evaluate signals.

    Typically `object.invalidate()` would cue a `Signal.evaluate(object, fn)` at
    some point in the future. (It is not great to `Signal.evaluate(object, fn)`
    synchronously inside `.invalidate()`, although this should only lead to
    wasted invalidations, not bad results. Errm, in most cases, at least.)
    **/

    static evaluate(signal, fn) {
        // Make signal the evaluating signal for the duration of this
        // synchronous evaluation of fn()
        const previous = evaluatingSignal;
        evaluatingSignal = signal;

        if (DEBUG) console.group(
            '%cSignal%c evaluate%c ' + evaluatingSignal.constructor.name + '[' + evaluatingSignal.id + ']',
            'color: #718893; font-weight: 300;',
            'color: #3896BF; font-weight: 300;',
            'color: #718893; font-weight: 300;'
        );

        const value = fn.apply(signal);

        if (window.DEBUG && window.DEBUG.signal !== false) console.groupEnd();

        evaluatingSignal = previous;
        return value;
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

    constructor() {
        if (DEBUG) { this.id = ++id; }
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
StateSignal(value)
*/

class StateSignal extends Signal {
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
ComputeSignal(value)
*/

class ComputeSignal extends Signal {
    // Privates
    #valid;
    #value;
    #evaluate;

    constructor(fn) {
        super();
        if (fn) { this.#evaluate = fn; }
    }

    /**
    .value
    Getting `.value` gets value from the cache or, if the signal is invalid,
    evaluates a value from `fn`. During evaluation this signal is registered as
    dependent on other signals whose value is read.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #value
        if (evaluatingSignal) setDependency(this, evaluatingSignal);
        if (this.#valid) return this.#value;
        this.#value = Signal.evaluate(this, this.#evaluate);
        this.#valid = true;
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


/*
ObserveSignal(fn)
*/

const promise = Promise.resolve();

export class ObserveSignal {
    #signal;
    #fn;

    constructor(signal, fn, initial) {
        this.id      = ++id;
        this.#signal = signal;
        this.#fn     = fn;

        // Set up dependency graph, return value
        const value = Signal.evaluate(this, this.#evaluate);

        // Run the observer if value is not initial
        if (signal.value !== initial) this.#fn(value);
    }

    #evaluate() {
        return this.#signal.value;
    }

    invalidate(signal) {
        if (this.status === 'done') return;

        // Verify that signal has the right to invalidate this
        if (signal && !hasInput(this, signal)) return;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Evaluate and send value to consumer on next tick
        promise.then(() => this.#fn(Signal.evaluate(this, this.#evaluate)));
    }

    stop() {
        // Check and set status
        if (this.status === 'done') {
            if (window.DEBUG) {
                console.log(this);
                throw new Error('Stream: cannot stop() stream that is done');
            }

            return this;
        }

        this.status = 'done';
        return this;
    }
}
