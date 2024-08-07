
import Signal from './signal.js';

const assign       = Object.assign;
const define       = Object.defineProperties;
const isExtensible = Object.isExtensible;
const O            = Object.prototype;
const $trap        = Symbol('data');
const properties   = { [$trap]: {} };


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
        && !Node.prototype.isPrototypeOf(object)
        // Reject WebAudio context
        && (window.BaseAudioContext === undefined || !BaseAudioContext.prototype.isPrototypeOf(object))
        // Reject date, their methods don't enjoy being proxied
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

function getSignal(signals, name, value) {
    return signals[name] || (signals[name] = Signal.of(value));
}

function getValue(signals, name, object) {
    // Is the property mutable? Note that unset properties have no descriptor
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    const mutable    = descriptor ?
        descriptor.writable || descriptor.set :
        object[name] === undefined ;

    // If there is no evaluating signal there is no need to create
    // a property signal
    if (!mutable || !Signal.evaluating) {
        return object[name];
    }

    const signal = getSignal(signals, name, object[name]);

    // Reading signal.value causes whatever signal is reading
    // the property to become a dependency of this signal
    return signal.value;
}

function getTrap(object) {
    return Data(object) && object[$trap];
}


/*
DataTrap(object)
*/

function DataTrap(object) {
    this.signals = {};
    this.object  = object;
    this.data    = new Proxy(object, this);

    // Define trap as object[$trap]
    properties[$trap].value = this;
    define(object, properties);
}

assign(DataTrap.prototype, {
    get: function get(object, name, proxy) {
        // Don't observe changes to symbol properties, and
        // don't allow Safari to log __proto__ as a Proxy. (That's dangerous!
        // It pollutes Object.prototpye with [$trap] which breaks everything.)
        if (typeof name === 'symbol' || name === '__proto__') {
            return object[name];
        }

        const value = getValue(this.signals, name, object);

        // We are not interested in getting proxies of the prototype chain so
        // stick to hasOwnProperty
        if (!O.hasOwnProperty.call(object, name)) {
            return value;
        }

        // Return observer
        return Data(value) || value ;
    },

    set: function set(object, name, value, proxy) {
        if (typeof name === 'symbol' || name === '__proto__') {
            object[name] = value;
            return true;
        }

        // Make sure we are dealing with an unproxied value.
        const targetValue = Data.objectOf(value);

        // If we are setting the same value, we're not really setting at all.
        // In this case regard a proxy as equivalent (??)
        if (object[name] === value || object[name] === targetValue) {
            return true;
        }

        // To support arrays keep a note of pre-change length
        const length = object.length;

        // Set value on object. Don't use value again, in case target
        // is doing something funky with property descriptors that return a
        // different value from the value that was set. Rare, but it can happen.
        object[name] = targetValue;

        // Set value on signal
        if (this.signals[name]) {
            // Don't use targetValue again, in case object is doing something
            // funky with property descriptors that return a different value
            // from the value that was set. Rare, but it can happen. Read the
            // actual value back off the object.
            this.signals[name].value = object[name];
        }

        // Check if length has changed and update its signal if it has
        if (name !== 'length' && object.length !== length && this.signals.length) {
            this.signals.length.value = object.length;
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


/*
Data(object, force)
Forces creation of an observer even where Data would normally consider
the object 'immutable'. Data considers DOM nodes immutable, for example, but
not because they are really immutable, more in order to prevent you calling node
methods on a node's observer proxy, which is a source of hard-to-trace errors.
Pass in `force` as `true` if you know what you are doing.
*/

export default function Data(object, force) {
    return !object ? undefined :
        object[$trap] ? object[$trap].data :
        (force || isMuteable(object)) ? (new DataTrap(object)).data :
        undefined ;
}

/**
Data.of(object)

Returns the data proxy of `object`. The data proxy is a wrapper that observes
mutations made to `object`. There is only ever one data proxy of `object`, and
calls to `Data.of(object)` always return that data proxy.

_Getting_ a property of a data proxy while evaluating a signal registers the
signal as dependent on the property. _Setting_ a property of a data proxy
notifies dependent signals.

Getting a property of a data proxy returns a data proxy of that property
of `object`. In this way access chains like `data.property.value` are also
observed.

Not all objects may be proxied. Frozen objects, unextensible objects, and
various others like Sets, Maps and DOM and WebAudio nodes are deemed
immutable or otherwise unobservable. They return `undefined`.
**/

Data.of = (object) => Data(object);

/**
Data.objectOf(data)

Returns the un-proxied `object` wrapped by `Data.of(object)`, or, if `data` is
already just an object, `data`. Getting and setting properties of `object` has
no effect on the data proxy.
**/

Data.objectOf = function(object) {
    return object && object[$trap] ?
        object[$trap].object :
        object ;
};

/**
Data.observe(data)

Returns the un-proxied `object` wrapped by a `Data.of(object)` proxy, or,
if `data` is already just an object, `data`.
**/

Data.observe = function(name, object, fn, initial) {
    const trap = Data(object) && object[$trap];
    if (!trap) return;

    const signal = getSignal(trap.signals, name, trap.object[name]);
    return Signal.observe(signal, fn, initial);
};

/*
Data.signal(path, data)
*/

Data.signal = function(name, object) {
    const trap   = Data.of(object) && object[$trap];
    return trap ?
        getSignal(trap.signals, name, trap.object[name]) :
        nothing ;
};
