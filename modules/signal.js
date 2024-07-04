
import noop from './noop.js';

const assign = Object.assign;

let evaluatingSignal;

function register(s2, s1) {
    // Set input of evaluating signal
    let n = 0;
    while (s2[--n]);
    s2[n] = s1;

    // Set output of value signal
    n = -1;
    while (s1[++n]) if (s1[n] === s2) return;
    s1[n] = s2;
}

function evaluate(signal, fn) {
    // Clear out input signals, they are about to be reevaluated
    let n = 0;
    while (signal[--n]) signal[n] = undefined;

    // Make signal the evaluating signal for the duration of this
    // synchronous evaluation of fn()
    const childSignal = evaluatingSignal;
    evaluatingSignal = signal;
    const value = signal.value = fn();
    evaluatingSignal = childSignal;

    // Enable use of `return evaluate(signal, fn);`
    return value;
}


/**
Signal(fn)
An object that encapsulates a value and notifies when the value becomes invalid,
out of date. It has, essentially, one property, `.value`. Setting `.value`
caches that value and invalidates any signals that depend on this signal.
Getting `.value` returns the cached value, or if the cache is invalid, generates
a new value by calling `fn()`.
**/

export default class Signal {
    /**
    Signal.of(value)
    Creates a value signal with totally optional initial `value`.
    **/
    static of(value) {
        const signal = new this();
        signal.value = value;
        return signal;
    }

    /**
    Signal.from(fn)
    Creates a compute signal where `fn` should compute and return a value.
    While `fn` is running, reading other signals is being recorded, and this
    signal is then invalidated when they become invalid.
    **/
    static from(fn) {
        // Promise
        if (fn.then) {
            const signal = new this();
            fn.then((value) => signal.value = value);
            return signal;
        }
        // Pipeable
        else if (fn.pipe) {
            const signal = new this();
            fn.pipe({ push: (value) => signal.value = value });
            return signal;
        }
        // Function
        else {
            return new this(fn);
        }
    }

    /*
    Signal.evaluating
    The signal that is currently being evaluated, or undefined. This is exposed
    so that Data() can make a better call about when to create signals. If there
    is no evaluating signal, it needn't make a signal when a property is accessed.
    Deliberately not documented.
    */

    static get evaluating() {
        return evaluatingSignal;
    }

    #valid;
    #cache;
    // TEMP
    #notify;
    #fn;

    constructor(fn, notify) {
        // Signal is
        if (fn) { this.#fn = fn; }
        this.#notify = notify || noop;
    }

    /**
    .value
    Getting `.value` gets value from the cache or computes a value.
    Setting `.value` updates the cache and invalidates all dependent signals.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #cache
        if (evaluatingSignal) {
            register(evaluatingSignal, this);
        }

        return this.#valid ? this.#cache : evaluate(this, this.#fn) ;
    }

    set value(value) {
        // Don't update for no change in value
        if(this.#cache === value) {
            this.#valid = true;
            return;
        }

        // Set cached value
        this.#cache = value;

        if (this.#valid) {
            // Invalidate dependents. This may cause them to update synchronously
            // ... but #valid is true and #cache is set so that's ok I think?
            let n = -1;
            while (this[++n]) this[n].invalidate(this);
            this.#notify();
        }
        else {
            this.#valid = true;
        }
    }

    /**
    .each(fn[, initial])
    TEMP
    Pulls value and calls `fn` whenever the signal is invalidated, making this a
    hot signal. Calls `fn` immediately if current value is not equal to `initial`.
    **/

    each(fn, initial) {
        this.#notify = () => {
            const value = this.value;

            if (value === initial) {
                // Nothing ever equals NaN
                initial = NaN;
                return;
            }

            fn(value);
        };

        // Notify immediately
        this.#notify();
        return this;
    }

    observe(fn, initial) {
        // Add to signals called on invalidation
        let n = -1;
        while (this[++n]);
        this[n] = { invalidate: fn };
        // Run the observer if value is not initial
        if (this.value !== initial) { fn(); }
        return this;
    }

    unobserve(fn) {

    }

    /**
    .invalidate()
    Invalidates signal and all dependent signals.
    **/

    invalidate() {
        if (this.#valid) {
            // Invalidate this
            this.#valid = false;
            // Invalidate dependents
            let n = -1;
            while (this[++n]) this[n].invalidate(this);
            this.#notify();
        }

        return this;
    }

    valueOf() {
        return this.value;
    }

    toString() {
        return this.valueOf() + '' ;
    }

    toJSON() {
        return this.value;
    }
}
