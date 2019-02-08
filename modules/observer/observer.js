
export const $observer = Symbol('observer');

const A            = Array.prototype;
const DOMPrototype = (window.EventTarget || window.Node).prototype;
const nothing      = Object.freeze([]);
const isExtensible = Object.isExtensible;


// Utils

function isArrayLike(object) {
	return object
	&& typeof object === 'object'
	// Slows it down a bit
	//&& object.hasOwnProperty('length')
	&& typeof object.length === 'number' ;
}


// Listeners

export function getListeners(object, name) {
	return object[$observer].properties[name]
		|| (object[$observer].properties[name] = []);
}

function fire(fns, value, record) {
	if (!fns) { return; }
    fns = fns.slice(0);
	var n = -1;
	while (fns[++n]) {
        // For OO version
        //fns[n].update(value, record);

		fns[n](value, record);
	}
}


// Observer proxy

function trapGet(target, name, self) {
	// Ignore symbols
	let desc;
	return typeof name !== 'symbol'
		&& ((desc = Object.getOwnPropertyDescriptor(target, name)), !desc || desc.writable)
		&& Observer(target[name])
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

		var properties = target[$observer].properties;
		var change;

		// We are setting length
		if (name === 'length') {
			if (value >= target.length) {
				// Don't allow array length to grow like this
				//target.length = value;
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

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, change);

		// Return true to indicate success
		return true;
	}
};

const objectHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// If we are setting the same value, we're not really setting at all
		if (target[name] === value) { return true; }

        // Set value on target
		target[name] = value;

        // Notify the observer
        var properties = target[$observer].properties;
		fire(properties[name], Observer(value) || value);

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, {
			name:    name,
			removed: target[name],
			added:   value
		});

		// Return true to indicate success
		return true;
	}

    //			apply: function(target, context, args) {
    //console.log('MethodProxy', target, context, args);
    //debugger;
    //				return Reflect.apply(target, context, args);
    //			}
};

function createObserver(target) {
	var observer = new Proxy(target, isArrayLike(target) ?
		arrayHandlers :
		objectHandlers
	);

	// This is strict but slow
	//define(target, $observer, {
    //    value: {
    //        observer:   observer,
    //        properties: {},
    //        mutate:     []
    //    }
    //});

	// An order of magnitude faster
	target[$observer] = {
		target:     target,
		observer:   observer,
		properties: {},
		mutate:     []
	};

	return observer;
}

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
		// Reject DOM nodes, Web Audio context, MIDI inputs,
		// XMLHttpRequests, which all inherit from EventTarget
		//&& !DOMPrototype.isPrototypeOf(object)
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

export function notify(object, path) {
	const observer = object[$observer];
	if (!observer) { return; }

	const fns = observer.properties;
	fire(fns[path], object[path]);

    const mutate = observer.mutate;
	fire(mutate, object);
}

export function Observer(object) {
	return !object ? undefined :
		object[$observer] ? object[$observer].observer :
		isObservable(object) && createObserver(object) ;
}

export function Target(object) {
	return object
		&& object[$observer]
		&& object[$observer].target
		|| object ;
}
