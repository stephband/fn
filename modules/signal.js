
import noop from './noop.js';

const assign = Object.assign;

let evaluatingSignal;


/**
Signal()
Signal(fn)

Creates an object that encapsulates a value and notifies when the value becomes
invalid, out of date, irrelevant, historic, old. It has, essentially, one property,
`.value`.

Setting `.value` caches that value and invalidates any signals that depend on
this signal. Getting `.value` returns the cached value – or, if the cache is
invalid, evaluates a new value by calling `fn()`, where it exists.

Signals implement `.valueOf()` and so in some contexts they may be used directly
where a primitive is expected.
**/

export default class Signal {
    #valid;
    #cache;
    #fn;

    constructor(fn) {
        if (fn) { this.#fn = fn; }
    }

    /**
    Signal.of(value)
    Creates a value signal with totally optional initial `value`.
    **/
    static of(value) {
        const signal = new Signal();
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
            const signal = new Signal();
            fn.then((value) => signal.value = value);
            return signal;
        }
        // Pipeable
        else if (fn.pipe) {
            const signal = new Signal();
            fn.pipe({ push: (value) => signal.value = value });
            return signal;
        }
        // Function
        else {
            return new Signal(fn);
        }
    }

    /**
    Signal.evaluate(object, fn)
    Evaluates `object` as a signal by applying it to `fn` and returning the
    result. Signals read during `fn()` have `object` registered as a dependent,
    so `object.invalidate()` is called when any of those signals are invalidated.

    Typically `object.invalidate()` would cue a `Signal.evaluate(object, fn)` at
    some point in the future. (It is not great to `Signal.evaluate(object, fn)`
    synchronously inside `.invalidate()`, although this should only lead to
    wasted invalidations, not bad results.)
    **/

    static evaluate(signal, fn) {
        // Make signal the evaluating signal for the duration of this
        // synchronous evaluation of fn()
        const previous = evaluatingSignal;
        evaluatingSignal = signal;
        const value = fn.apply(signal);
        evaluatingSignal = previous;
        return value;
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


    /**
    .value

    Getting `.value` gets value from the cache or evaluates a value from `fn`.
    During evaluation this signal is registered as dependent on other signals
    whose `.value` is got.

    Setting `.value`, assuming the set value differs from the previous value,
    updates the cache and invalidates dependent signals.
    **/

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #cache
        if (evaluatingSignal) {
            let n = -1;
            while (this[++n]) if (this[n] === evaluatingSignal) break;
            this[n] = evaluatingSignal;
        }

        return this.#valid ? this.#cache : (this.value = Signal.evaluate(this, this.#fn)) ;
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
            // Invalidate dependents. If a dependent updates synchronously here
            // we may be in trouble but #valid is true and #cache is set so
            // that's ok I think?
            let n = -1;
            let signal;
            while (signal = this[++n]) {
                this[n] = undefined;
                signal.invalidate(this);
            }
        }
        else {
            this.#valid = true;
        }
    }

    /**
    .invalidate()
    Invalidates this signal and all dependent signals.
    **/

    invalidate() {
        if (this.#valid) {
            // Invalidate this
            this.#valid = false;
            // Invalidate dependents. If a dependent updates synchronously here
            // we may be in trouble, as it would evaluate and cache this signal
            // and overwrite dependents before we have finished invalidating
            // this set of dependents.
            let n = -1;
            let signal;
            while (signal = this[++n]) {
                this[n] = undefined;
                signal.invalidate(this);
            }
        }
    }

    /**
    .observe(fn),
    .observe(fn, initialValue)
    Returns an observer that calls `fn` with `signal.value` whenever the signal
    is invalidated. If signal does not have `initialValue`, `fn` is also called
    immediately.
    **/

    observe(fn, initial) {
        // Add to signals called on invalidation
        let n = -1;
        while (this[++n]);
        return this[n] = new ObserverSignal(this, fn, initial);
    }

    /*
    .valueOf()
    Enable direct use in some contexts like addition or string concatenation.
    */

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


/**
ObserverSignal(fn)
**/

export class ObserverSignal {
    #signal;
    #fn;

    constructor(signal, fn, initial) {
        this.#signal = signal;
        this.#fn     = fn;

        // Run the observer if value is not initial
        if (signal.value !== initial) { this.invalidate(); }
    }

    #evaluate() {
        return this.#signal.value;
    }

    invalidate() {
        if (this.status === 'done') return this;

        // Evaluate and send value to consumer.
        // TODO: it remains to be seen whether this is a safe thing to do
        // synchronously. Because this happens during an invalidate it may be
        // that some other signal due to be invalidated is evaluated here before
        // that has occurred.
        const value = Signal.evaluate(this, this.#evaluate);
        this.#fn(value);
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
