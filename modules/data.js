
import Signal from './signal.js';
//import isMutableProperty from './is-mutable-property.js';


const assign       = Object.assign;
const define       = Object.defineProperties;
const isExtensible = Object.isExtensible;
const O            = Object.prototype;
const $trap        = Symbol('data');
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

function getSignal(signals, name, object) {
    return signals[name] || (signals[name] = Signal.fromProperty(name, object));
}

function getTrap(object) {
    return Data(object) && object[$trap];
}

function isObservableProperty(name, object, enumerables, functions, methods) {
    // If there's a descriptor return its mutability
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) {
        return (!enumerables || descriptor.enumerable)
            && (descriptor.writable ?
                functions || typeof object[name] !== 'function' :
                !!descriptor.set);
    }

    // If there's a prototype look for property on it
    const prototype = Object.getPrototypeOf(object);
    if (prototype) return isObservableProperty(name, prototype, enumerables, methods, methods);

    // If there is no prototypes property must be unset
    return true;
}


/*
DataTrap(object)
*/

function DataTrap(object, enumerables = false, functions = true, methods = false) {
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

        const value = Signal.evaluating && isObservableProperty(name, object, this.enumerables, this.functions, this.methods) ?
            // ...read value from the signal graph
            getSignal(this.signals, name, object).value :
            // ...otherwise there is no need to register the get
            object[name] ;

        // We are not interested in getting proxies of stuff in the prototype
        // chain so stick to hasOwnProperty. TODO: ARE WE REALLY NOT, THO? What
        // about values returned by getters? Eh?
        /*if (!O.hasOwnProperty.call(object, name)) {
            return value;
        }*/

        // Return data proxy. There's a problem here. If object[name] is not
        // writable AND not configurable returning a proxy of value throws
        // an error regardless as to whether value is itself proxy-able
        return Data(value) || value ;
    },

    set: function set(object, name, value, proxy) {
        if (typeof name === 'symbol' || name === '__proto__') {
            object[name] = value;
            return true;
        }

        // Arrays: note pre-change length to detect length-affecting mutations
        const length = this.isArray ? object.length : undefined;

        // Set unproxied value on signal or directly on object
        if (this.signals[name]) {
            // Make sure we are setting an unproxied value.
            this.signals[name].value = Data.objectOf(value);
        }
        else {
            object[name] = Data.objectOf(value);
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
            this.signals[name].value = object[name];
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

Takes an optional `options` object:

```
{
    // Force objects normally considered immutable to pass the mutability test
    force: true,
    // Observe only enumerable properties
    enumerables: true,
    // Observe changes to properties that are functions
    functions: true,
    // Observe changes to properties that are (at least initially) functions in
    // the prototype chain
    methods: true
}
```
**/

const defaults = {};

export default function Data(object, options = defaults) {
    return !object ? undefined :
        object[$trap] ? object[$trap].data :
        (options.force || isMuteable(object)) ? (new DataTrap(object, options.enumerables, options.functions, options.methods)).data :
        undefined ;
}


/**
Get the data proxy of `object`. The data proxy is a wrapper that observes
mutations. There is only ever one data proxy of `object`, and calls to
`Data.of(object)` always return that data proxy.

Not all objects may be proxied. Frozen objects, unextensible objects, and
various others like Sets, Maps and DOM and WebAudio nodes are deemed
immutable or otherwise unobservable. They return `undefined`.

_Getting_ a property of a data proxy while evaluating a signal registers the
signal as dependent on the property. _Setting_ a property of a data proxy
notifies dependent signals.

Getting a property of a data proxy returns a data proxy of that property
of `object`. In this way access chains like `data.property.value` are also
observed.

@param {object} object
An object or array.

@param {boolean} force
Forces the creation of a data proxy where `object` would otherwise be deemed
immutable. DOM nodes are considered immutable, for example, but not because they
really are immutable, more in order to prevent you calling node methods on a
node's observer proxy, a source of hard-to-trace errors. Pass in `force` as
`true` if you know what you are doing.

@returns {object}
The data proxy of `object`.
**/

Data.of = (object, options) => Data(object, options);


/**
Get the un-proxied `object` wrapped by `Data.of(object)` (or, if `data` is
already an un-proxied object, `data`).

@param {object} data
A data proxy.

@returns {object}
The un-wrapped, un-proxied object.
**/

Data.objectOf = function(object) {
    return object && object[$trap] ?
        object[$trap].object :
        object ;
};


/**
@ignore
Data.signal(path, data)
*/

Data.signal = function(name, object) {
    const trap = Data.of(object) && object[$trap];
    return trap ?
        getSignal(trap.signals, name, trap.object) :
        nothing ;
};
