
const global = globalThis;
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

function clearInputs(signal) {
    let n = 0;
    while (signal[--n]) {
        // -------------------------- Experimental -----------------------------
        // Stop inputs? An input with a stop method – an observer – can only have
        // become a dependency if it were constructed during a render (they don't
        // evaluate synchronously so they don't become dependencies otherwise).
        // Therefore also, it can only have one output, this. Therefore it is
        // safe to stop it. I am right about this am I not?
        if (signal[n].stop) signal[n].stop();
        // ---------------------------------------------------------------------
        signal[n] = undefined;
    }
}

function stopInputs(signal) {
    // Remove this from signal graph
    let n = 0;
    while (signal[--n]) {
        // -------------------------- Experimental -----------------------------
        // Stop inputs? An input with a stop method – an observer – can only have
        // become a dependency if it were constructed during a render (they don't
        // evaluate synchronously so they don't become dependencies otherwise).
        // Therefore also, it can only have one output, this. Therefore it is
        // safe to stop it. I am right about this am I not?
        if (signal[n].stop) signal[n].stop();
        // -----------------------------------------------------------------
        else removeOutput(signal[n], signal);
        signal[n] = undefined;
    }
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

    Creates a compute signal from a function, where `fn` computes a value by
    reading other signals' values. This signal is then invalidated when any of
    the read signals are invalidated.

    Creates a state signal from a promise that invalidates dependencies when the
    promise resolves.
    **/

    static from(fn, context) {
        // Promise
        if (fn.then) {
            const signal = Signal.of();
            fn.then((value) => signal.value = value);
            return signal;
        }

        // Function
        return new ComputeSignal(fn, context);
    }

    static compute(fn, context) {
        return new ComputeSignal(fn, context);
    }

    /**
    Signal.fromProperty(name, object)
    Signal.fromProperty(name, object, context)

    Returns a signal that wraps property `name` of `object`. Setting
    `signal.value` invalidates the dependency graph. Getting `signal.value`
    reads a cached value, or if the signal is invalid, the property `name` of
    `object`.

    Where a `context` object is given the property is evaluated with `context`
    set as context rather than `object`. If the property has a getter this
    means that any properties it reads are read from `context`. Here be dragons!
    Only if `context` is a subclass of `object` will the getter be able to read
    private fields of `object`. Proxies and objects inheriting via
    `Object.create(object)` will throw an error. Use with caution.
    **/

    static fromProperty(name, object, context) {
        return new PropertySignal(name, object, context);
    }

    /**
    Signal.frame(fn, initial)
    Returns an observe signal, a form of compute signal that calls `fn` once
    immediately, and then on every animation frame following the invalidation
    of any signal read during the execution of `fn`.
    **/

    static frame(fn) {
        return new FrameSignal(fn);
    }

    /**
    Signal.tick(fn, initial)
    Returns an observe signal, a form of compute signal that calls `fn` once
    immediately, and then on every tick following the invalidation of any signal
    read during the execution of `fn`.
    **/

    static tick(fn) {
        // Add to signals called on invalidation
        return new TickSignal(fn);
    }

    /**
    Signal.temporal(name, object)
    Creates a signal with an `.invalidateUntil(time)` method that maintains
    invalidity until `time` is reached.
    **/

    static temporal(name, object) {
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

        // Call synchronous updates
        //if (!evaluatingSignal) handlers.forEach(call);

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
PropertySignal(name, object)
PropertySignal(name, object, context)
Wraps a property in a signal. The optional `context` object evaluates the
property in the context of `context` rather than `object`.
*/

class PropertySignal extends Signal {
    // Privates
    #valid;
    #value;

    constructor(name, object, context) {
        super(name);
        this.object  = object;
        this.context = context;
    }

    evaluate() {
        const { object, name, context } = this;
        return context ?
            Reflect.get(object, name, context) :
            object[name] ;
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
        // WE PROBABLY SHOULD NOT DO THIS FOR ACCESSOR PROPERTIES, they can return
        // something other than what is set, after all. In fact we probably should only
        // do this on own non-accessors. We don't currently ask for the descriptor.
        if (this.#valid && this.#value === value) return;

        const { object, name, context } = this;

        // Set value on object and update value from object in case target is
        // doing something funky with property descriptors that return a
        // different value from the value set.
        if (context) {
            Reflect.set(object, name, value, context);
        }
        else {
            object[name] = value;

            // AGAIN, IF IT'S AN OWN NON-ACCESSOR WE CAN CHECK FOR VALUE HERE
            // AND AVOID INVALIDATION IF VALUE HAS NOT CHANGED AGAINST #value.
            // if(this.#value === value) return;
        }

        this.invalidate();
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
        clearInputs(this);

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
        clearInputs(this);

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
the future. This ensures that any FrameSignal signals that depend on it keep
rendering until automation completes.
**/

export class TimedSignal extends Signal {
    #validTime = 0;

    constructor(name, object) {
        super(name);
        this.object = object;
    }

    getTime() {
        return global.performance.now();
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
        console.warn('Dont really want to be setting value of TimedSignal');
        console.trace();

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
Observer(evaluate)
An Observer is a signal that schedules it's own evaluation. It calls `evaluate`
on construction and again on every cue following an invalidation of any signal
read by `evaluate`. Internal only, sub-classed by `TickSignal` and `FrameSignal`.
*/

function link(a, b) {
    b.cued = true;
    return a.next = b;
}

function unlink(a, b) {
    b.cued = false;
    a.next = b.next;
    // If b.next is not null it now should be
    if (b.next) b.next = null;
    // And if it is it must have been the tail of the list. Note that it is fine
    // if `a` is constructor at this point - a.next is null so constructor.tail
    // will be overwritten in the next .cue().
    else b.constructor.tail = a;
}

function render(constructor) {
    let a = constructor;
    let b;
    while (b = a && a.next) {
        // Evaluate the signal
        switch (Signal.evaluate(b, b.evaluate)) {
            case undefined:
                // Unless an invalid dependency is flagged remove from observers
                if (!hasInvalidDependency) unlink(a, b);
                break;
            case true:
                // Keep it in observers to force re-render on next tick/frame
                a = b;
                break;
            case false:
                // Force removal from signal graph
                stopInputs(b);
                // And remove from observers
                unlink(a, b);
                break;
            default:
                throwInvalidReturn(b)
        }
    }
}

function throwInvalidReturn(signal) {
    throw new Error(`Signal.${ signal.constructor.name.slice(0,-6).toLowerCase() }(fn) callback must return true, false or undefined`);
}

class Observer extends Signal {
    constructor(fn) {
        super();

        if (DEBUG) {
            this.id = ++id;
            console.log(
                '%cSignal%c create%c ' + this.constructor.name + '#' + this.id + (this.name ? ' "' + this.name + '"' : ''),
                'color: #718893; font-weight: 300;',
                'color: #3896BF; font-weight: 300;',
                'color: #718893; font-weight: 300;'
            );
        }

        // Check we are not currently evaluating. This would be bad because an
        // evaluation is ephemereal – it may run again, leaving this signal in
        // memory yet superseded by the one created in the latest evaluation.
        if (evaluatingSignal) {
            // ------------------------ Experimental ---------------------------
            // We can set this as an input of evaluatingSignal. this will never
            // invalidate evaluatingSignal – it has no mechanism to do so – but
            // when evaluatingSignal is invalidated this will be stopped.
            let n = 0;
            while (evaluatingSignal[--n]) if (evaluatingSignal[n] === this) break;
            evaluatingSignal[n] = this;
            // -----------------------------------------------------------------
        }

        // If no fn passed in we do not want to evaluate the signal immediately.
        // This provides for a sub-class to define .evaluate() and launch it
        // when it likes, as in Literal's Renderer.
        if (!fn) return;

        // Set fn as evaluation function
        this.evaluate = fn;

        // Prepare for linked list
        this.cued = false;
        this.next = null;

        // An initial, synchronous evaluation binds this observer to changes
        switch (Signal.evaluate(this, this.evaluate)) {
            case undefined:
                // If invalid dependency is flagged cue a render
                if (hasInvalidDependency) this.cue();
                break;
            case true:
                // Force cue a render
                this.cue();
                break;
            case false:
                // Force removal from signal graph
                stopInputs(this);
                break;
            default:
                throwInvalidReturn(this);
        }
    }

    invalidate(input) {
        // Static observers list
        let head = this.constructor;

        // If the observer is already cued do nothing
        if (this.cued) return;
        //while (head = head.next) if (head === this) return;

        // Verify that input signal has the right to invalidate this
        if (input && !hasInput(this, input)) return;

        // Clear inputs
        clearInputs(this);

        this.cue();
    }

    stop() {
        // Remove from signal graph
        stopInputs(this);

        // Remove from observers if cued
        let a = this.constructor;
        let b;
        if (this.cued) while (b = a.next) {
            if (b === this) {
                unlink(a, b);
                break;
            }
            a = b;
        }

        return this;
    }

    valueOf()  { return this; }
    toString() { return '[object Signal]' ; }
    toJSON()   { return; }
}


/*
TickSignal
A TickSignal is a signal that calls `fn` on construction and again on every
tick following an invalidation of any signal read by `fn`. Use `Signal.tick(fn)`.
*/

const promise = Promise.resolve();

function tick() {
    render(TickSignal);
    // Where observers remain schedule the next tick
    if (TickSignal.next) promise.then(tick);
}

export class TickSignal extends Observer {
    static next = null;
    static tail = null;

    cue() {
        const constructor = this.constructor;

        // No observers are cued for render
        if (!constructor.next) {
            // Start the link list
            constructor.tail = link(constructor, this);
            // Cue tick() on the next tick
            promise.then(tick);
        }
        else {
            // Add to link list
            constructor.tail = link(constructor.tail, this);
        }
    }
}


/*
FrameSignal

A FrameSignal is an observer signal that calls `fn` on construction and again
on every animation frame following an invalidation of any signal read by `fn`.
Additionally where the return value of `fn()` is truthy the signal remains
active and will evaluate on following frames until `fn()` is false-y.

Use `Signal.frame(fn)` to create a FrameSignal signal.
*/

function frame() {
    render(FrameSignal);
    // Where observers remain schedule the next frame
    if (FrameSignal.next) requestAnimationFrame(frame);
}

export class FrameSignal extends Observer {
    static next = null;
    static tail = null;

    cue() {
        const constructor = this.constructor;

        // No observers are cued for render
        if (!constructor.next) {
            // Start the link list
            constructor.tail = link(constructor, this);
            // Cue frame() on the next frame
            requestAnimationFrame(frame);
        }
        else {
            // Add to link list
            constructor.tail =link(constructor.tail, this);
        }
    }
}
