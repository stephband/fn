(function(window) {
	"use strict";

	if (!window.Proxy) {
		console.warn('Proxy constructor not found. This version of Observable cannot be used.');
		return;
	}

	var A            = Array.prototype;
	var isExtensible = Object.isExtensible;

	var $observable  = Symbol('observable');
	var $observers   = Symbol('observers');
	var $update      = Symbol('update');

	///^\[?([-\w]+)(?:=(['"])([-\w]+)\2)?\]?\.?/g;
	var rname        = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?\.?/g;

	// Utils

	function noop() {}

	function isArrayLike(object) {
		return object.hasOwnProperty('length') &&
			typeof object.length === 'number' ;
	}


	// Observable
	function trapGet(target, name, self) {
		var value = target[name];
console.trace('GET', name)
		// Ignore symbols
		return typeof name === 'symbol' ?
			value :
			Observable(value) || value ;
	}

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

			// We are setting length
			if (name === 'length') {
				if (value >= target.length) {
					// Don't allow array length to grow like this
					//target.length = value;
					return true;
				}

				target.length = value;

				while (--old >= value) {
					fire(observers[old], undefined);
				}
			}

			// We are setting an integer string or number
			else if (+name % 1 === 0) {
				if (value === undefined) {
					if (+name < target.length) {
						A.splice.call(target, name, 1);
						value = target[name];
					}
				}
				else {
					target[name] = value;
				}
			}

			// We are setting some other key
			else {
				target[name] = value;
			}

			fire(observers[name], Observable(value) || value);
			fire(observers[$update], receiver);

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

	function fire(observers, value) {
		if (!observers) { return; }

		// Todo: What happens if observers are removed during this operation?
		var n = -1;
		while (observers[++n]) {
			observers[n](value);
		}
	}

	function isObservable(object) {
		return object
			&& typeof object === 'object'
			&& isExtensible(object)
			&& !(object instanceof Date) ;
	}

	function Observable(object) {
		if (!isObservable(object)) { return; }

		if (object[$observable]) {
			return object[$observable];
		}

		var observable = new Proxy(object, isArrayLike(object) ?
			arrayHandlers :
			objectHandlers
		);

		object[$observers]  = {};
		object[$observable] = observable;

		return observable;
	}


	// Observable.observe

	function getObservers(object, name) {
		return object[$observers][name] || (object[$observers][name] = []) ;
	}

	function removeObserver(observers, fn) {
		var i = observers.indexOf(fn);
		observers.splice(i, 1);
	}

	function observePrimitive(object, fn) {
		if (fn.value !== object) {
			fn(object);
			fn.value = object;
		}

		return noop;
	}

	function observeObject(object, fn) {
		var observers = getObservers(object, $update);

		observers.push(fn);

		if (object !== fn.value) {
			fn(object);
			fn.value = object;
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

	function observe(object, path, fn) {
		if (!path.length) {
			return isObservable(object) ?
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

		return match ?
			observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) ;
	}

	function notify(object, path) {
		var observers = object[$observers];
		fire(observers[path], object[$observable]);
		fire(observers[$update], object);
	}

	Observable.isObservable = isObservable;
	Observable.notify       = notify;

	Observable.observe = function(object, path, fn) {
		// Coerce to string
		path += '';
		object = Observable(object);

		return object ? observe(object, path, fn) : noop ;
	};

	// Export

	window.Observable = Observable;

})(this);
