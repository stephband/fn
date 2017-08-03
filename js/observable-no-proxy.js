(function(window) {
	"use strict";

	var A           = Array.prototype;
	var assign      = Object.assign;
	var define      = Object.defineProperties;
	var _observe    = window.observe;

	var $original   = Symbol('original');
	var $observable = Symbol('observable');
	var $observers  = Symbol('observers');
	var $update     = Symbol('update');

	var rname       = /^\[?([-\w]+)(?:=(['"])([-\w]+)\2)?\]?\.?/g;


	// Array proxy

	function ArrayProxy(array) {
		this[$observable] = this;
		this[$original]   = array;
		this[$observers]  = array[$observers];

		assign(this, array);
		this.length = array.length;
	}

	define(ArrayProxy.prototype, {
		length: {
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
		}
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





	// Utils

	function noop() {};

	function isArrayLike(object) {
		return typeof object === 'object'
			&& object.hasOwnProperty('length')
			&& typeof object.length === 'number' ;
	}

	function hasItems(object) {
		return object && object.length ;
	}


	// Observable

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

		if (isArrayLike(object)) {
			object[$observers]  = {};
			var observable = new ArrayProxy(object);
			object[$observable] = observable;

			return observable;
		}

		return object;
	}


	// Observable.observe

	function observePrimitive(object, fn) {
		if (fn.value !== object) {
			fn(object);
			fn.value = object;
		}

		return noop;
	}

	function observeArray(array, fn) {
		var observable = Observable(array);
console.log('>>', array);
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

	function observeItem(array, key, match, path, fn) {
		var unobserve = noop;

		function isMatch(item) {
			return item[key] == match;
		}

		function update(array) {
			var value = array && array.find(isMatch);
console.log('UPDATE VALUE', value)
			unobserve();
			unobserve = observe(Observable(value), path, fn);
		}

		var unobserveArray = observeArray(array, update);

		return function() {
			unobserve();
			unobserveArray();
		};
	}

	function observeProperty(object, name, path, fn) {
		var unobserve = noop;

		function update(value) {
//console.log('UPDATE PROPERTY ', name, value, path, JSON.stringify(object));
			unobserve();
			unobserve = observe(Observable(value), path, fn);
		}
//console.log('OBSERVE PROPERTY', name, object[$observable] || object)
		var _unobserve = _observe(object[$observable] || object, name, update);

		update(object[name]);

		return function() {
			unobserve();
			_unobserve();
		};
	}

	function observe(object, path, fn) {
		if (!path.length) {
			return object && isArrayLike(object) ?
				observeArray(object, fn) :
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
//console.log('MATCH', name, match)
		return match ?
			observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) ;
	}

	function notify(object, path) {
		var name       = path;
		var old        = object[name];
		var observable = object[$observable];
		var observers  = object[$observers];

		if (name.length) {
			hasItems(observers[name]) && fire(observers[name], Observable(object[name]));
		}

		hasItems(observers[$update]) && fire(observers[$update], observable);
	}

	Observable.noproxy = true;
	Observable.observe = observe;
	Observable.notify  = notify;

	// Export

	window.Observable = Observable;

})(this);
