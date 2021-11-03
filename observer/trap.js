
const assign = Object.assign;

export function fire(fns, name, value) {
    if (!fns || !fns.length) { return 0; }
    fns = fns.slice(0);
    var n = -1;

    while (fns[++n]) {
        // Observables are objects with a fn property
        fns[n].fn(name, value);
    }

    return n;
}

export default function Trap() {
    this.observables = {};
    this.gets = [];
    this.sets = undefined;
}

assign(Trap.prototype, {
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
        value = target[name];

        // Check if length has changed and notify if it has
        if (name !== 'length' && target.length !== length) {
            fire(this.observables.length, target.length);
        }

        fire(this.observables[name], value);
        fire(this.sets, value);

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