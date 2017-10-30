(function(window) {
	"use strict";

	if (!window.Proxy) {
		console.warn('Proxy constructor not found. This version of Observable cannot be used.');
		return;
	}

	var EventTarget    = window.EventTarget;

	var A              = Array.prototype;
	var assign         = Object.assign;
	var isFrozen       = Object.isFrozen;
	var getPrototypeOf = Object.getPrototypeOf;

	var $observable    = Symbol('observable');
	var $observers     = Symbol('observers');
	var $update        = Symbol('update');

	var nothing        = Object.freeze([]);

	///^\[?([-\w]+)(?:=(['"])([-\w]+)\2)?\]?\.?/g;
	var rname          = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?\.?/g;

	// Utils

	function noop() {}

	function isArrayLike(object) {
		return object.hasOwnProperty('length') &&
			typeof object.length === 'number' ;
	}


	// Observable
	function trapGet(target, name, self) {
		var value = target[name];

		// Ignore symbols
		return typeof name === 'symbol' ? value :
			Observable(value) || value ;
	}

	//var change = {};

	var arrayHandlers = {
		get: trapGet,

		set: function(target, name, value, receiver) {
			// We are setting a symbol
			if (typeof name === 'symbol') {
				target[name] = value;
				return true;
			}

			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			var observers = target[$observers];
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
					fire(observers[old], undefined);
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

			fire(observers[name], Observable(value) || value);
			fire(observers[$update], receiver, change);

			//change.index = 0;
			//change.removed.length = 0;
			//change.added.length = 0;

			// Return true to indicate success
			return true;
		}
	};

	var objectHandlers = {
		get: trapGet,

		set: function(target, name, value, receiver) {
			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			target[name] = value;

			var observers = target[$observers];

			fire(observers[name], Observable(value) || value);
			fire(observers[$update], receiver);

			// Return true to indicate success
			return true;
		}
	};

	function fire(observers, value, record) {
		if (!observers) { return; }

		// Todo: What happens if observers are removed during this operation?
		// Bad things, I'll wager.
		var n = -1;
		while (observers[++n]) {
			observers[n](value, record);
		}
	}

	// The TypedArray prototype is not accessible directly
	var TA = getPrototypeOf(Float32Array.prototype);

	function isTypedArray(object) {
		return TA.isPrototypeOf(object);
	}

	function isMap(object) {
		return TA.isPrototypeOf(object);
	}

	function isObservable(object) {
		// Many built-in objects and DOM objects bork when calling their
		// methods via a proxy. They should be considered not observable.
		// I wish there were a way of whitelisting rather than
		// blacklisting, but it would seem not.

		return object
			// Reject primitives, null and other frozen objects
			&& !isFrozen(object)
			// Reject DOM nodes, Web Audio context and nodes, MIDI inputs,
			// XMLHttpRequests, which all inherit from EventTarget
			&& !EventTarget.prototype.isPrototypeOf(object)
			// Reject dates
			&& !(object instanceof Date)
			// Reject regex
			&& !(object instanceof RegExp)
			// Reject maps
			&& !(object instanceof Map)
			&& !(object instanceof WeakMap)
			// Reject sets
			&& !(object instanceof Set)
			&& !(object instanceof WeakSet)
			// Reject TypedArrays
			&& !(isTypedArray(object)) ;
	}

	function createProxy(object) {
		var proxy = new Proxy(object, isArrayLike(object) ?
			arrayHandlers :
			objectHandlers
		);

		object[$observers]  = {};
		object[$observable] = proxy;

		return proxy;
	}

	function Observable(object) {
		return !object ? undefined :
			object[$observable] ? object[$observable] :
			!isObservable(object) ? undefined :
		createProxy(object) ;
	}


	// Observable.observe

	function getObservers(object, name) {
		return object[$observers][name]
			|| (object[$observers][name] = []);
	}

	function removeObserver(observers, fn) {
		var i = observers.indexOf(fn);
		observers.splice(i, 1);
	}

	function observePrimitive(object, fn) {
		if (object !== fn.value) {
			fn.value = object;
			fn(object);
		}

		return noop;
	}

	function observeObject(object, fn) {
		var observers = getObservers(object, $update);
		var old       = fn.value;

		observers.push(fn);

		if (object !== fn.value) {
			fn.value = object;
			fn(object, {
				index:   0,
				removed: old ? old : nothing,
				added:   object
			});
		}

		return function unobserveObject() {
			removeObserver(observers, fn);
		};
	}

	function observeItem(object, key, match, path, fn) {
		var unobserve = noop;

		function isMatch(item) {
			return item[key] === match;
		}

		function update(array) {
			var value = array && A.find.call(array, isMatch);
			unobserve();
			unobserve = observe(value, path, fn);
		}

		var unobserveObject = observeObject(object, update);

		return function unobserveItem() {
			unobserve();
			unobserveObject();
		};
	}

	function observeProperty(object, name, path, fn) {
		var observers = getObservers(object, name);
		var unobserve = noop;

		function update(value) {
			unobserve();
			unobserve = observe(value, path, fn);
		}

		observers.push(update);
		update(object[name]);

		return function unobserveProperty() {
			unobserve();
			removeObserver(observers, update);
		};
	}

	function callbackItem(object, key, match, path, fn) {
		function isMatch(item) {
			return item[key] === match;
		}

		var value = array && A.find.call(array, isMatch);
		return observe(Observable(value) || value, path, fn);
	}

	function callbackProperty(object, name, path, fn) {
		return observe(Observable(object[name]) || object[name], path, fn);
	}

	function observe(object, path, fn) {
		if (!path.length) {
			// We can assume the full isObservable() check has been done, as
			// this function is only called internally or from Object.observe
			return object && object[$observable] ?
				observeObject(object, fn) :
				observePrimitive(object, fn) ;
		}

		if (!(object && typeof object === 'object')) {
			return observePrimitive(undefined, fn);
		}

		rname.lastIndex = 0;
		var tokens = rname.exec(path);

		if (!tokens) {
			throw new Error('Observable: invalid path "' + path + '"');
		}

		var name  = tokens[1];
		var match = tokens[3] && (
			tokens[2] ?
				tokens[3] :
				parseFloat(tokens[3])
		);

		path = path.slice(rname.lastIndex);

		return object[$observable] ?
			match ?
				observeItem(object, name, match, path, fn) :
				observeProperty(object, name, path, fn) :
			match ?
				callbackItem(object, name, match, path, fn) :
				callbackProperty(object, name, path, fn) ;
	}

	function notify(object, path) {
		var observers = object[$observers];
		fire(observers[path], object[$observable]);
		fire(observers[$update], object);
	}

	Observable.isObservable = isObservable;
	Observable.notify       = notify;

	Observable.observe = function(object, path, fn) {
		// Coerce path to string
		return observe(Observable(object) || object, path + '', fn);
	};

	Observable.filter = function(fn, array) {
		var subset = Observable([]);

		Observable.observe(array, '', function() {
			var filtered = array.filter(fn);
			assign(subset, filtered);
			subset.length = filtered.length;
		});

		return subset;
	};

	Observable.map = function(fn, array) {
		var subset = Observable([]);

		Observable.observe(array, '', function(observable) {
			var filtered = array.map(fn);
			assign(subset, filtered);
			subset.length = filtered.length;
		});

		return subset;
	};

	// Export

	window.Observable = Observable;

})(this);
