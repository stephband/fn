
import Signal from './signal.js';


const assign       = Object.assign;
const define       = Object.defineProperties;
const isExtensible = Object.isExtensible;
const O            = Object.prototype;
const $trap        = Symbol('data-trap');
const $options     = Symbol('data-options');
const properties   = { [$trap]: {} };
const global       = globalThis;


function isMuteable(object) {
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
        && (!global.Node || !Node.prototype.isPrototypeOf(object))
        // Reject WebAudio context
        && (!global.BaseAudioContext || !BaseAudioContext.prototype.isPrototypeOf(object))
        // Reject WebAudio params
        && (!global.AudioParam || !AudioParam.prototype.isPrototypeOf(object))
        // Reject date, their methods don't enjoy being proxied
        && !(object instanceof Date)
        // Reject regex
        && !(object instanceof RegExp)
        // Reject maps
        && !(object instanceof Map)
        && !(object instanceof WeakMap)
        // Reject sets
        && !(object instanceof Set)
        && !(object instanceof WeakSet);
        // Reject TypedArrays and DataViews. They don't enjoy having their
        // methods called from a proxy. On the other hand, it is useful to be
        // able to observe them...
        //&& !ArrayBuffer.isView(object) ;
}

function getSignal(signals, name, object, proxy) {
    return signals[name] || (signals[name] = Signal.fromProperty(name, object, proxy));
}

function getTrap(object) {
    return Data(object) && object[$trap];
}

function getDescriptor(name, object) {
    // If there's a descriptor return its mutability
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) return descriptor;

    // If there's a prototype look for property on it
    const prototype = Object.getPrototypeOf(object);
    if (prototype) return getDescriptor(name, prototype);
}

function isSetable(name, object) {
    const descriptor = getDescriptor(name, object);
    return descriptor && !!descriptor.set;
}

function getProperty(name, object, proxy, signals, enumerables, functions, methods, computed, o = object) {
    // If there's a descriptor return its mutability
    const descriptor = Object.getOwnPropertyDescriptor(o, name);
    if (descriptor) {
        // The enumerables flag, false by default, tells us non-enumerables are
        // not observable (the enumerables flag should not be set by the user
        // where the enumerable shape of an object is expected to change)
        if (enumerables && !descriptor.enumerable) {
            signals[name] = null;
            return object[name];
        }

        // The functions, or the methods (for prototypes), flag tells us that
        // function properties are observable (functions is true by default,
        // making them behave as any other property, methods should be set to
        // true by the user where functions on a prototype may be overridden)
        if (descriptor.writable) {
            if (functions || typeof o[name] !== 'function') {
                return getSignal(signals, name, object).value;
            }

            signals[name] = null;
            return object[name] ;
        }

        // If descriptor has a getter and a setter it is observable
        if (descriptor.get && descriptor.set) {
            const signal = getSignal(signals, name, object, computed && computed.includes(name) && proxy);
            return signal.value;
        }

        // Property is not writable nor has a setter – if it is an own
        // non-configurable we know it can never be made observable: non-writable
        // non-configurable value properties cannot return proxies, flag them as
        // false; flag non observables as null
        if (o === object && !descriptor.configurable) {
            signals[name] = null;
        }

        return object[name];
    }

    // If there's a prototype look for property on it
    const prototype = Object.getPrototypeOf(o);
    if (prototype) return getProperty(name, object, proxy, signals, enumerables, methods, methods, computed, prototype);

    // If there is no prototype property must be observable and unset
    return getSignal(signals, name, object).value;
}


/*
DataTrap(object)
*/

function DataTrap(object, enumerables = false, functions = true, methods = false, computed) {
    this.signals = {};
    this.object  = object;
    this.data    = new Proxy(object, this);
    this.isArray = Array.isArray(object);

    // If enumerables is true only enumerable properties are observed
    this.enumerables = enumerables;
    // If functions is true writable function properties are observed, true by default
    this.functions   = functions;
    // If methods is true writable function properties in the prototype chain are observed
    this.methods     = methods;
    // If properties are labelled as computed they are get/set with their proxies as context
    this.computed    = computed;

    // Define trap as object[$trap]
    properties[$trap].value = this;
    define(object, properties);
}

assign(DataTrap.prototype, {
    get: function get(object, name, proxy) {
        // Don't observe changes to symbol properties or the constructor, and
        // don't allow Safari to log __proto__ as a Proxy. That's dangerous! It
        // pollutes Object.prototype with [$trap], which breaks everything.
        if (typeof name === 'symbol' || name === 'constructor' || name === '__proto__') {
            return object[name];
        }

        // If signal graph is not evaluating read directly from object
        const value = !Signal.evaluating ? object[name] :
            // Is name in signals?
            name in this.signals ?
                // If it's a signal object we know this property is observable
                this.signals[name] ? this.signals[name].value :
                // If it's null we know it's not
                object[name] :
            // Test property for observability, cacheable state, and return value
            getProperty(name, object, proxy, this.signals, this.enumerables, this.functions, this.methods, this.computed) ;

        // Per-spec, if the property is a non-configurable non-writable own
        // property returning its proxy will error. At least then the user
        // knows their code is not doing what they might have assumed.
        return Data(value) || value ;
    },

    set: function set(object, name, value, proxy) {
        if (typeof name === 'symbol' || name === '__proto__') {
            object[name] = value;
            return true;
        }

        // Arrays: note pre-change length to detect length-affecting mutations
        const length = object.length;

        // Always set an unproxied value
        value = Data.objectOf(value);

        // Signal registered, set on signal
        if (this.signals[name]) {
            // Make sure we are setting an unproxied value.
            this.signals[name].value = value;
        }
        // No signal registered. Handle a very niche and gnarly corner case
        // where a computed accessor accesses a reactive property that is
        // already tied into the signal graph.
        else if (this.computed && this.computed.includes(name) && isSetable(name, object)) {
            Reflect.set(object, name, value, proxy);
        }
        // No signal registered, set directly on object
        else {
            object[name] = value;
        }

        if (this.isArray) {
            // Shortening an array via .length removes members without firing
            // deleteProperty, so their signals hold stale cached values -
            // invalidate them
            if (name === 'length') {
                let i = value - 1;
                while (++i < length) {
                    if (this.signals[i]) this.signals[i].invalidate();
                }
            }
            // A non-length set that changed length (push, array[n] = x) must
            // invalidate the length signal
            else if (object.length !== length && this.signals.length) {
                this.signals.length.invalidate();
            }
        }

        // Return true to indicate success to Proxy
        return true;
    },

    deleteProperty: function(object, name) {
        delete object[name];

        if (typeof name !== 'symbol' && name !== '__proto__' && this.signals[name]) {
            this.signals[name].invalidate();
        }

        // Indicate success to the Proxy
        return true;
    }
});


/**
Data(object),
Data(object, options)

Get the data proxy of `object`. The data proxy is a wrapper that observes
mutations. There is only ever one data proxy of `object`, and calls to
`Data(object)` always return that data proxy.

Not all objects may be proxied. Frozen objects, non-extensible objects, and
various others like Sets, Maps and DOM and WebAudio nodes are deemed immutable
or otherwise unobservable. They return `undefined`.

Getting_ a property of a data proxy while evaluating a signal registers the
signal as dependent on the property. _Setting_ a property of a data proxy
notifies dependent signals.

Getting a property of a data proxy returns a data proxy of that property
of `object`. In this way access chains like `data.property.value` are also
observed.

Takes an optional `options` object that may have the following properties:

- `force`:       forces objects normally considered immutable to pass the mutability test, `false` by default
- `enumerables`: observes only enumerable properties, `false` by default
- `methods`:     observes changes to prototype properties that are functions, `false` by default
- `functions`:   observes changes to own properties that are functions, `true` by default
- `computed`:    an array of property names of accessor properties that
    themselves access other reactive properties; properties marked as computed
    cannot access private fields: `undefined` by default

A data proxy's options are set the first time the proxy is created. They are not
changed by subsequent calls to `Data()`.
**/

const defaults = {};

export default function Data(object, options = defaults) {
    if (!object) return undefined;
    if (object[$trap]) return object[$trap].data;
    const settings = object.constructor && object.constructor[$options] || options;
    if (!(settings.force || isMuteable(object))) return undefined;
    const trap = new DataTrap(object, settings.enumerables, settings.functions, settings.methods, settings.computed);
    return trap.data;
}


/**
Data.of(object)
**/

Data.of = (object) => Data(object);


/**
Data.objectOf(object)

Get the un-proxied `object` wrapped by `Data.of(object)` (or, if `data` is
already an un-proxied object, `data`).
**/

Data.objectOf = function(object) {
    return object && object[$trap] ?
        object[$trap].object :
        object ;
};

/**
Data.define(constructor, options)
Defines Data options as a static symbol property on a class constructor.
Constructed objects use these options for their reactive behaviour.
**/

Data.define = function(constructor, options) {
    if (constructor.hasOwnProperty($options)) {
        throw new Error(`Data.define() options already defined for class ${ constructor.name }`);
    }

    constructor[$options] = options;
    return constructor;
};


/**
Data.signal(path, data)
**/

Data.signal = function(name, object) {
    const trap = Data.of(object) && object[$trap];
    return trap ?
        getSignal(trap.signals, name, trap.object) :
        undefined ;
};
