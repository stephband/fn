(function(window) {
	"use strict";

	if (!window.Proxy) {
		console.warn('Proxy constructor not found. This version of Observable cannot be used.');
		return;
	}

	var A           = Array.prototype;

	var $observable = Symbol('observable');
	var $observers  = Symbol('observers');
	var $update     = Symbol('update');

	var rname       = /^\[?([-\w]+)(?:=(['"])([-\w]+)\2)?\]?\.?/g;


	// Utils

	function noop() {};

	function isArrayLike(object) {
		return object.hasOwnProperty('length') &&
			typeof object.length === 'number' ;
	}

	function hasItems(object) {
		return object && object.length ;
	}


	// Observable

	var arrayHandlers = {
		get: function(target, name, self) {
			var value = target[name];
			// Ignore symbols
			return typeof name === 'symbol' ? value : Observable(value) ;
		},

		set: function(target, name, value, receiver) {
			var old = target[name];
			var names = [name];

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
					hasItems(observers[old]) && fire(observers[old], undefined);
				}
			}
			
			// We are setting an integer string or number
			else if (+name % 1 === 0) {
				if (value === undefined) {
					A.splice.call(target, name, 1);
				}
				else {
					target[name] = value;
				}

				hasItems(observers[name]) && fire(observers[name], Observable(target[name]));
			}

			// We are setting some other key
			else {
				target[name] = value;
				hasItems(observers[name]) && fire(observers[name], Observable(value));
			}

			hasItems(observers[$update]) && fire(observers[$update], receiver);

			return true;
		}
	};

	var objectHandlers = {
		get: function(target, name, self) {
			var value = target[name];
			// Ignore symbols
			return typeof name === 'symbol' ? value : Observable(value) ;
		},

		set: function(target, name, value, receiver) {
			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			target[name] = value;

			var observers = target[$observers];

			hasItems(observers[name])    && fire(observers[name], Observable(value));
			hasItems(observers[$update]) && fire(observers[$update], receiver);

			return true;
		}
	};

	function fire(observers, value) {
		// Todo: What happens if observers are removed during this operation?
		var n = -1;
		while (observers[++n]) {
			observers[n](value);
		}
	}

	function Observable(object) {
		if (!object || typeof object !== 'object' || object instanceof Date) {
			return object;
		}

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

	function observePrimitive(object, fn) {
		if (fn.value !== object) {
			fn(object);
			fn.value = object;
		}

		return noop;
	}

	function observeObject(array, fn) {
		var observers =
			array[$observers][$update] ||
			(array[$observers][$update] = []) ;		

		observers.push(fn);
		
		// Empty arrays report as undefined
		//var value = array.length ? array : undefined;
		if (array !== fn.value) {
			fn(array);
			fn.value = array;
		}

		return function() {
			var i = observers.indexOf(fn);
			observers.splice(i, 1);
		};
	}

	function observeItem(object, key, match, path, fn) {
		var unobserve = noop;

		function isMatch(item) {
			return item[key] == match;
		}

		function update(array) {
			var value = array && A.find.call(array, isMatch);
			unobserve();
			unobserve = observe(value, path, fn);
		}

		var unobserveObject = observeObject(object, update);

		return function() {
			unobserve();
			unobserveObject();
		};
	}

	function observeProperty(object, name, path, fn) {
		var unobserve = noop;

		var observers =
			object[$observers][name] ||
			(object[$observers][name] = []) ;

		function update(value) {
			unobserve();
			unobserve = observe(value, path, fn);
		}

		observers.push(update);
		update(object[name]);

		return function() {
			unobserve();
			var i = observers.indexOf(update);
			observers.splice(i, 1);
		};
	}

	function observe(object, path, fn) {
		if (!path.length) {
			return object && typeof object === 'object' && !(object instanceof Date) ?
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
		var match = tokens[3];
		path = path.slice(rname.lastIndex);

		return match ?
			observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) ;
	}

	function notify(object, path) {
		var old = target[name];

		// If we are setting the same value, we're not really setting at all
		if (old === value) { return true; }

		target[name] = value;

		var observers = target[$observers];

		hasItems(observers[name])    && fire(observers[name], Observable(value));
		hasItems(observers[$update]) && fire(observers[$update], receiver);
	}

	Observable.observe = observe;
	Observable.notify  = notify;

	// Export

	window.Observable = Observable;

})(this);
