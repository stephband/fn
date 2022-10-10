
const assign       = Object.assign;
const define       = Object.defineProperties;
const isExtensible = Object.isExtensible;

const O     = Object.prototype;
const $trap = Symbol('observe');

export const analytics = {
    observables: 0,
    observes: 0
};

function remove(array, value) {
    const i = array.indexOf(value);
    if (i > -1) { array.splice(i, 1); }
    return array;
}


/**
Trap()
**/

const properties = { [$trap]: {} };

function fire(observables, value) {
    if (!observables || !observables.length) { return 0; }
    observables = observables.slice(0);
    var n = -1;

    while (observables[++n]) {
        // Where an observer causes others to stop we can end up with stopped
        // observables in the copy of the observables array. Our get and set
        // observers must be flagged. Pushing to them could cause an error.
        if (observables[n].status !== 'stopped') {
            observables[n].push(value);
        }
    }

    return n;
}

function Trap(target) {
    this.observables = {};
    this.gets     = [];
    this.sets     = undefined;
    this.target   = target;
    this.observer = new Proxy(target, this);

    // Define trap as target[$trap]
    properties[$trap].value = this;
    define(target, properties);
}

assign(Trap.prototype, {

    /* Helpers */

    notify: function(name) {
        fire(this.observables[name], this.target[name]);
        fire(this.sets, this.target);
    },

    listen: function(name, observable) {
        const observables = name === null ?
            (this.sets || (this.sets = [])) :
            (this.observables[name] || (this.observables[name] = [])) ;

        observables.push(observable);
    },

    unlisten: function(name, observable) {
        const observables = name === null ?
            this.sets :
            this.observables[name] ;

        if (observables) {
            remove(observables, observable);
        }
    },

    /* Traps */

    get: function get(target, name, proxy) {
        const value = target[name];

        // Don't observe changes to symbol properties, and
        // don't allow Safari to log __proto__ as a Proxy. (That's dangerous!
        // It pollutes Object.prototpye with [$trap] which breaks everything.)
        // Also, we're not interested in observing the prototype chain so
        // stick to hasOwnProperty.
        if (typeof name === 'symbol' || name === '__proto__') {
            return value;
        }

        // Is the property mutable? Note that unset properties have no descriptor
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        const mutable    = descriptor ?
            descriptor.writable || descriptor.set :
            value === undefined ;
            //true ;

        if (mutable) {
            fire(this.gets, name);
        }

        // We are not interested in getting proxies of the prototype chain
        if (!O.hasOwnProperty.call(target, name)) {
            return value;
        }

        // Get the observer of its value
        const observer = Observer(value);

        if (!observer) {
            return value;
        }

        // If get operations are being monitored, make them monitor the
        // object at the named key also
        var n = -1;
        while(this.gets[++n]) {
            this.gets[n].listen(name);
        }

        return observer;
    },

    set: function set(target, name, value, proxy) {
        if (typeof name === 'symbol' || name === '__proto__') {
            target[name] = value;
            return true;
        }

        // Make sure we are dealing with an unproxied value
        value = getTarget(value);

        // If we are setting the same value, we're not really setting at all
        if (target[name] === value) {
            return true;
        }

        // To support arrays keep a note of pre-change length
        const length = target.length;

        // Unbind get listeners on the old value?
        var n = -1;
        while(this.gets[++n]) {
            this.gets[n].unlisten(name);
        }

        // Set value on target. Then get the target's value just in case target
        // is doing something funky with property descriptors that return a
        // different value from the value that was set. Rare, but it can happen.
        target[name] = value;

        // Check if length has changed and notify if it has
        if (name !== 'length' && target.length !== length) {
            fire(this.observables.length, target.length);
        }

        this.notify(name);

        // Return true to indicate success to Proxy
        return true;
    },

    deleteProperty: function(target, name) {
        if (typeof name === 'symbol' || name === '__proto__') {
            // Delete without notifying
            delete target[name];
            return true;
        }

        if (!target.hasOwnProperty(name)) {
            // Nothing to delete
            return true;
        }

        delete target[name];
        this.notify(name);

        // Indicate success to the Proxy
        return true;
    }
});


/**
isMuteable(object)
**/

export function isMuteable(object) {
    // Many built-in objects and DOM objects bork when calling their
    // methods via a proxy. They should be considered not observable.
    // I wish there were a way of whitelisting rather than
    // blacklisting, but it would seem not.

    return object
        // Reject primitives and other frozen objects
        // This is really slow...
        //&& !isFrozen(object)
        // I haven't compared this, but it's necessary for audio nodes
        // at least, but then only because we're extending with symbols...
        // hmmm, that may need to change...
        && isExtensible(object)
        // This is less safe but faster.
        //&& (typeof object === 'object' || typeof object === 'function')

        // Reject DOM nodes
        && !Node.prototype.isPrototypeOf(object)
        // Reject WebAudio context
        && (typeof BaseAudioContext === 'undefined' || !BaseAudioContext.prototype.isPrototypeOf(object))
        // Reject dates
        && !(object instanceof Date)
        // Reject regex
        && !(object instanceof RegExp)
        // Reject maps
        && !(object instanceof Map)
        && !(object instanceof WeakMap)
        // Reject sets
        && !(object instanceof Set)
        && !(window.WeakSet && object instanceof WeakSet)
        // Reject TypedArrays and DataViews
        && !ArrayBuffer.isView(object) ;
}


/**
Observer(object)
Create an observer proxy around `object`. Mutations made to this proxy are
observable via `observe(path, object` and `mutations(paths, object)`.
**/

/**
Observer(object, force)
Forces creation of an observer even where Observer would normally consider
the object 'immutable'. Observer considers DOM nodes immutable, for example, but
not because they are really immutable, more in order to prevent you calling node
methods on a node's observer proxy, which is a source of hard-to-trace errors.
Use `force = true` if you know what you are doing.
**/

export function Observer(object, force) {
    return !object ? undefined :
        object[$trap] ? object[$trap].observer :
        (force || isMuteable(object)) ? (new Trap(object)).observer :
        undefined ;
}


/**
getTarget(object)
**/

export function getTarget(object) {
    return object && object[$trap] && object[$trap].target || object ;
}


/**
getTrap(object)
**/

export function getTrap(object) {
    return Observer(object) && object[$trap];
}


/*
notify(path, object)
Force the `object`'s Observer to register a mutation at `path`.
*/

export function notify(name, object) {
    const trap = object[$trap];
    if (trap) {
        trap.notify(name);
    }
}
