(function(window) {
	"use strict";

	var assign         = Object.assign;
	var define         = Object.defineProperty;
	var isFrozen       = Object.isFrozen;
	var getPrototypeOf = Object.getPrototypeOf;

	var A              = Array.prototype;

	var $original      = Symbol('original');
	var $observable    = Symbol('observable');
	var $observers     = Symbol('observers');
	var $update        = Symbol('update');

	var DOMObject      = window.EventTarget || window.Node;
	var nothing        = Object.freeze([]);
	var rname          = /[\.\[]?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?/g;


	// Utils

	function noop() {}

	function isArrayLike(object) {
		return object
		&& object.hasOwnProperty('length')
		&& typeof object.length === 'number' ;
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
			&& !DOMObject.prototype.isPrototypeOf(object)
			// Reject dates
			&& !(object instanceof Date)
			// Reject regex
			&& !(object instanceof RegExp)
			// Reject maps
			&& !(object instanceof Map)
			&& !(object instanceof WeakMap)
			// Reject sets
			&& !(object instanceof Set)
			&& !(window.WeakSet ? object instanceof WeakSet : false)
			// Reject TypedArrays and DataViews
			&& !ArrayBuffer.isView(object) ;
	}

	function getObservers(object, name) {
		return object[$observers][name]
			|| (object[$observers][name] = []);
	}

	function removeObserver(observers, fn) {
		var i = observers.indexOf(fn);
		observers.splice(i, 1);
	}

	function fire(observers, value, record) {
		if (!observers) { return; }

		// Todo: What happens if observers are removed during this operation?
		// Bad things, I'll wager.
		var n = -1;
		while (observers[++n]) {
			observers[n](value, record);
		}
	}


	// Proxy

	var createProxy = window.Proxy ? (function() {
		function trapGet(target, name, self) {
			var value = target[name];

			// Ignore symbols
			return typeof name === 'symbol' ? value :
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
				var length = target.length;

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

				if (target.length !== length) {
					fire(observers.length, target.length);
				}

				fire(observers[name], Observable(value) || value);
				fire(observers[$update], receiver, change);

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

				var observers = target[$observers];
				var change = {
					name:    name,
					removed: target[name],
					added:   value
				};

				target[name] = value;

				fire(observers[name], Observable(value) || value);
				fire(observers[$update], receiver, change);

				// Return true to indicate success
				return true;
			}
		};

		return function createProxy(object) {
			var proxy = new Proxy(object, isArrayLike(object) ?
				arrayHandlers :
				objectHandlers
			);

			define(object, $observers, { value: {} });
			define(object, $observable, { value: proxy });

			return proxy;
		};
	})() : (function() {
		// Code for IE, whihc does not support Proxy

		function ArrayProxy(array) {
			this[$observable] = this;
			this[$original]   = array;
			this[$observers]  = array[$observers];

			assign(this, array);
			this.length = array.length;
		}

		define(ArrayProxy.prototype, 'length', {
			set: function(length) {
				var array = this[$original];

				if (length >= array.length) { return; }

				while (--array.length > length) {
					this[array.length] = undefined;
				}

				this[array.length] = undefined;

				//console.log('LENGTH', length, array.length, JSON.stringify(this))

				//array.length = length;
				notify(this, '');
			},

			get: function() {
				return this[$original].length;
			},

			configurable: true
		});

		assign(ArrayProxy.prototype, {
			filter:  function() { return A.filter.apply(this[$original], arguments); },
			find:    function() { return A.find.apply(this[$original], arguments); },
			map:     function() { return A.map.apply(this[$original], arguments); },
			reduce:  function() { return A.reduce.apply(this[$original], arguments); },
			concat:  function() { return A.concat.apply(this[$original], arguments); },
			slice:   function() { return A.slice.apply(this[$original], arguments); },
			some:    function() { return A.some.apply(this[$original], arguments); },
			indexOf: function() { return A.indexOf.apply(this[$original], arguments); },
			forEach: function() { return A.forEach.apply(this[$original], arguments); },
			toJSON:  function() { return this[$original]; },

			sort: function() {
				A.sort.apply(this[$original], arguments);
				assign(this, array);
				this.length = array.length;
				notify(this, '');
				return this;
			},

			push: function() {
				var array = this[$original];
				var value = A.push.apply(array, arguments);
				assign(this, array);
				this.length = array.length;
				console.log('PUSH', JSON.stringify(arguments));
				notify(this, '');
				return value;
			},

			pop: function() {
				var array = this[$original];
				var value = A.pop.apply(array, arguments);
				assign(this, array);
				this.length = array.length;
				notify(this, '');
				return value;
			},

			shift: function() {
				var array = this[$original];
				var value = A.shift.apply(array, arguments);
				assign(this, array);
				this.length = array.length;
				notify(this, '');
				return value;
			},

			splice: function() {
				var array = this[$original];
				var value = A.splice.apply(array, arguments);
				assign(this, array);
				this.length = array.length;
				notify(this, '');
				return value;
			}
		});

		return function createNoProxy(object) {
			var proxy;

			if (isArrayLike(object)) {
				define(object, $observers, { value: {} });
				proxy = isArrayLike(object) ? new ArrayProxy(object) : object ;
			}
			else {
				proxy = object;
			}

			define(object, $observable, { value: proxy });
			return proxy;
		};
	})() ;


	// observe

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

	var observeProperty = window.Proxy ? function observeProperty(object, name, path, fn) {
		var observers = getObservers(object, name);
		var unobserve = noop;

		function update(value) {
			unobserve();
			unobserve = observePrimitive(value, fn);
		}

		observers.push(update);
		update(object[name]);

		return function unobserveProperty() {
			unobserve();
			removeObserver(observers, update);
		};
	} : function observePropertyNoProxy(object, name, path, fn) {
		var unobserve = noop;

		function update(value) {
			unobserve();
			unobserve = observe(value, path, fn);
		}

		var _unobserve = window.observe(object[$observable] || object, name, update);
		update(object[name]);

		return function() {
			unobserve();
			_unobserve();
		};
	} ;

	function callbackItem(object, key, match, path, fn) {
		function isMatch(item) {
			return item[key] === match;
		}

		var value = object && A.find.call(object, isMatch);
		return observe(Observable(value) || value, path, fn);
	}

	function callbackProperty(object, name, path, fn) {
		return observe(Observable(object[name]) || object[name], path, fn);
	}

	function observe(object, path, fn) {
		// We can assume the full isObservable(object) check has been done, as
		// this function is only called internally or from Object.observe
		//
		// The object[$observers] check is for IE - it checks whether the
		// object is observable for muteability.

		// Catches '' as well as undefined
		if (!path) {
console.log('NOT PATH', path, object);
			return observePrimitive(object, fn) ;
		}

		if (path === '.') {
console.log('DOT PATH', path, object);
			return object && object[$observable] && object[$observers] ?
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
			// If there are quotes
			tokens[2] ?
				// ...it's a string
				tokens[3] :
				// ...otherwise, a number
				parseFloat(tokens[3])
		);

		path = path.slice(rname.lastIndex);

		return object[$observable] ?
			match ? observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) :
		match ? callbackItem(object, name, match, path, fn) :
		callbackProperty(object, name, path, fn) ;
	}


	// Observable

	function Observable(object) {
		return !object ? undefined :
			object[$observable] ? object[$observable] :
			!isObservable(object) ? undefined :
		createProxy(object) ;
	}

	Observable.isObservable = isObservable;

	Observable.notify = function notify(object, path) {
		var observers = object[$observers];
		fire(observers[path], object[$observable]);
		fire(observers[$update], object);
	};

	Observable.observe = function(object, path, fn) {
		return observe(Observable(object) || object, path, fn);
	};

	// Experimental

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
