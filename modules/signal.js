
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
    return false;
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
    true of an ObserveSignal, which is not really a signal at all – it cannot
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
            const signal = Signal.of();
            fn.pipe({ push: (value) => signal.value = value });
            return signal;
        }

        // Function
        return new ComputeSignal(fn, context);
    }

    static fromProperty(name, object) {
        // Function
        return new PropertySignal(name, object);
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
    Signal.createPropertyDescriptor(descriptor)
    Creates a signal-backed get/set property descriptor object from a standard
    `descriptor` object.

    If `descriptor` has a getter function any signals evaluated by that function
    invalidate the property when they become invalid. If `descriptor` has `.value`
    the property is invalidated when a new value is assigned to `object.name`.
    **/

    static createPropertyDescriptor(descriptor) {
        const symbol = Symbol();

        return assign({}, descriptor, descriptor.get ? {
            get: function() {
                const signal = this[symbol] || (this[symbol] = Signal.from(descriptor.get, this));
                return signal.value;
            }
        } : {
            get: function() {
                const signal = this[symbol] || (this[symbol] = Signal.of(descriptor.value));
                return signal.value;
            },

            set: descriptor.writable && function(value) {
                const signal = this[symbol] || (this[symbol] = Signal.of(value));
                signal.value = value;
            },

            value:    undefined,
            writable: undefined
        }) ;
    }

    /**
    Signal.define(object, name, descriptor)
    Apes `Object.defineProperty()` by defining a signal-backed get/set property
    `object.name` from a `descriptor` object.

    If `descriptor` has a getter function any signals evaluated by that function
    invalidate the property when they become invalid. If `descriptor` has `.value`
    the property is invalidated when a new value is assigned to `object.name`.
    **/

    static define(object, name, descriptor) {
        return Object.defineProperty(object, name, Signal.createPropertyDescriptor(descriptor)) ;
    }

    /**
    Signal.evaluate(signal, fn[, context])

    A function for building objects that behave as compute signals.

    Evaluates `object` as a signal by applying it to `fn` and returning the
    result. Signals read during `fn()` have `object` registered as a dependent,
    so `object.invalidate()` is called when any of those signals are invalidated.
    It's the same function as that used internally to evaluate signals.

    Typically `object.invalidate()` would cue a `Signal.evaluate(object, fn)` at
    some point in the future. (It is not great to `Signal.evaluate(object, fn)`
    synchronously inside `.invalidate()`, although this should only lead to
    wasted invalidations, not bad results. Errm, in most cases, at least.)
    **/

    static evaluate(signal, fn, context = signal) {
        // Make signal the evaluating signal for the duration of this
        // synchronous evaluation of fn()
        const previous = evaluatingSignal;
        evaluatingSignal = signal;

        if (DEBUG) console.group(
            '%cSignal%c evaluate%c ' + evaluatingSignal.constructor.name + '#' + evaluatingSignal.id + (evaluatingSignal.name ? ' "' + evaluatingSignal.name + '"' : ''),
            'color: #718893; font-weight: 300;',
            'color: #3896BF; font-weight: 300;',
            'color: #718893; font-weight: 300;'
        );

        const value = fn.apply(context);

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

    constructor(name) {
        if (name) this.name = name;

        if (DEBUG) {
            this.id   = ++id;
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
PropertySignal(value)
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
        this.#valid = true;
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
ObserveSignal(fn)
TEMP: are we sure we are keeping this? Used by Data.observe() and <lieral-html>.
*/

const promise = Promise.resolve();

export class ObserveSignal {
    #signal;
    #fn;

    constructor(signal, fn, initial) {
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
