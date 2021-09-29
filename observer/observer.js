
//const DEBUG = window.DEBUG === true;

const assign = Object.assign;
const define = Object.defineProperties;
const isExtensible = Object.isExtensible;

export const $observer = Symbol('observer');

export const analytics = {
    observables: 0,
    observes: 0
};

export function remove(array, value) {
    const i = array.indexOf(value);
    if (i > -1) { array.splice(i, 1); }
    return array;
}

export function getTarget(object) {
    return object && object[$observer] && object[$observer].target || object ;
}

export function getObservables(key, target) {
    const handlers = target[$observer];
    const observables = handlers.observables || (handlers.observables = {});
    return observables[key] || (observables[key] = []);
}

function fire(fns, name, value) {
    if (!fns) { return 0; }
    fns = fns.slice(0);
    var n = -1;

    while (fns[++n]) {
        // Support objects or functions (TEMP)
        if (fns[n].fn) {
            fns[n].fn(name, value);
        }
        else {
            fns[n](name, value);
        }
    }

    return n;
}

/*
notify(object, path)
Force the `object`'s Observer to register a mutation at `path`.
*/

export function notify(path, object) {
    const observer = object[$observer];
    if (!observer) { return; }
    const target = observer.target;
    return fire(getObservables(path, target), target[path]);
}


// Observer proxy

function isObservable(object) {
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
        //&& typeof object === 'object'

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

/*
function trapGet(target, name, observer) {
    let desc;
        // If the property's not a symbol
    return typeof name !== 'symbol'
        // and it's writable
        && ((desc = Object.getOwnPropertyDescriptor(target, name)), !desc || desc.writable)
        // return the observer of its value
        && Observer(target[name])
        // otherwise the value
        || target[name] ;
}

const arrayHandlers = {
    get: trapGet,

    set: function(target, name, value, receiver) {
        // We are setting a symbol
        if (typeof name === 'symbol') {
            target[name] = value;
            return true;
        }

        var old = target[name];
        var length = target.length;

        // If we are setting the same value, we're not really setting at all
        if (old === value) { return true; }

        var properties = target[$data].properties;
        var change;

        // We are setting length
        if (name === 'length') {
            if (value >= target.length) {
                // Don't allow array length to grow like this
                target.length = value;
                return true;
            }

            change = {
                index:   value,
                removed: A.splice.call(target, value),
                added:   nothing,
            };

            while (--old >= value) {
                fire(properties[old], undefined);
            }
        }

        // We are setting an integer string or number
        else if (+name % 1 === 0) {
            name = +name;

            if (value === undefined) {
                if (name < target.length) {
                    change = {
                        index:   name,
                        removed: A.splice.call(target, name, 1),
                        added:   nothing
                    };

                    value = target[name];
                }
                else {
                    return true;
                }
            }
            else {
                change = {
                    index:   name,
                    removed: A.splice.call(target, name, 1, value),
                    added:   [value]
                };
            }
        }

        // We are setting some other key
        else {
            target[name] = value;
        }

        if (target.length !== length) {
            fire(properties.length, target.length);
        }

        // Notify the observer
        fire(properties[name], Observer(value) || value);

        var mutate = target[$data].mutate;
        fire(mutate, receiver, change);

        // Return true to indicate success
        return true;
    }
};
*/

/** 
ObjectTrap()
**/

const properties = {
    [$observer]: {}
};

function ObjectTrap() {
    this.observables = {};
    this.gets = [];
}

assign(ObjectTrap.prototype, {
    // Inside handlers, observer is the observer proxy or an object that 
    // inherits from it
    get: function get(target, name, proxy) {
        const value = target[name];

        // Don't observe changes to symbol properties, and
        // don't allow Safari to log __proto__ as a Proxy. (That's dangerous!
        // It pollutes Object.prototpye with [$observer] which breaks everything.)
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

        if (mutable) {
            fire(this.gets, name);
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

        // If we are setting the same value, we're not really setting at all
        if (target[name] === value) {
            return true;
        }

        var n = -1;
        while(this.gets[++n]) {
            this.gets[n].unlisten(name);
        }

        // Set the target of value on target. Then use that as value just 
        // in case target is doing something funky with property descriptors
        // that return a different value from the value that was set. Rare,
        // but it can happen.
        target[name] = getTarget(value);
        value = target[name];

        const observables = this.observables[name]; 
        if (observables) {
            fire(observables, value);
        }

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

        const observables = this.observables[name]; 
        if (observables) {
            fire(observables, target[name]);
        }
        
        // Indicate success to the Proxy
        return true;
    }
});

function createObserver(target) {
    const traps    = new ObjectTrap();
    const observer = new Proxy(target, traps);

    traps.observer = observer;
    traps.target   = target;

    properties[$observer].value = traps;
    define(target, properties);
    return observer;
}


/**
Observer(object)
Create an observer proxy around `object`. Mutations made to this proxy are 
observable via `observe(path, object` and `mutations(paths, object)`.
**/

export function Observer(object) {
    return !object ? undefined :
        (object[$observer] && object[$observer].observer || (isObservable(object) ?
            createObserver(object) :
            undefined
        ));
}

