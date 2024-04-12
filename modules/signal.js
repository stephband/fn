
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

function evaluate(signal) {
    // Clear out input signals, they are about to be reevaluated
    let n = 0;
    while (signal[--n]) signal[n] = undefined;

    // Make signal the evaluating signal for the duration of this
    // synchronous evaluation of fn()
    const childSignal = evaluatingSignal;
    evaluatingSignal = signal;
    const value = signal.value = signal.fn();
    evaluatingSignal = childSignal;

    // Enable use of evaluate(this) as a return value
    return value;
}

/**
Signal(fn)
An object that encapsulates a value and notifies when the value becomes invalid,
out of date. It has, essentially, one property, `.value`. Setting `.value`
invalidates any signals that depend on this signal and caches the value. Getting
`.value` returns the cached value, or if the cache is invalid, generates a new
value from `fn`.
**/

export default class Signal {
    static of(value) {
        return assign(new this(), { value });
    }

    static from(fn) {
        return new this(...arguments);
    }

    /*
    Signal.evaluating
    The signal that is currently being evaluated, or undefined. This is exposed
    so that Data() can make a better call about when to create signals. If there
    is no evaluating signal, it needn't make a signal when a property is accessed.
    */
    static get evaluating() {
        return evaluatingSignal;
    }

    #valid;
    #cache;

    constructor(fn) {
        this.fn = fn;
    }

    invalidate() {
        if (this.#valid) {
            // Invalidate this
            this.#valid = false;
            // Invalidate dependents
            let n = -1;
            while (this[++n]) this[n].invalidate();
        }

        return this;
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
            // Invalidate dependents. This may cause them to update ... but
            // #valid is true and #cache is set so that's ok I think?
            let n = -1;
            while (this[++n]) this[n].invalidate();
        }
        else {
            this.#valid = true;
        }
    }

    get value() {
        // If there is a signal currently evaluating then it becomes a
        // dependency of this signal, irrespective of state of #cache
        if (evaluatingSignal) {
            register(evaluatingSignal, this);
        }

        return this.#valid ? this.#cache : evaluate(this) ;
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
