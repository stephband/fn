(function(window) {
	"use strict";

	var A           = Array.prototype;

	var $observable = Symbol('observable');
	var $observers  = Symbol('observers');
//	var $changes    = Symbol('changes');
//	var $queued     = Symbol('queued');
	var $update     = Symbol('update');

	var rname = /^\[?([-\w]+)(?:=(['"])([-\w]+)\2\])?\.?/g;

	var noop = function() {};

//	var p = Promise.resolve();
//	var requestTick = p.then.bind(p);

	var arrayHandlers = {
		get: function(target, name, self) {
			var value = target[name];
			// Ignore symbols
			return typeof name === 'symbol' ? value : Observable(value) ;
		},

		set: function(target, name, value, receiver) {
			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

//			var changes = target[$changes] || (target[$changes] = []);

			// We are setting length
			if (name === 'length') {
				if (value >= target.length) {
					// Don't allow array length to grow like this
					//target.length = value;
					return true;
				}

//				var n = target.length;
//				while (n-- > value) {
//					changes.push({
//						action: 'delete',
//						key: n,
//						value: target[n]
//					});
//				}

				target.length = value;
			}

			// We are setting an integer string or number
			else if (+name % 1 === 0) {
				if (value === undefined) {
					target.splice(name, 1);
				}
				else {
					target[name] = value;
				}

//				if (old !== undefined) {
//					changes.push({
//						action: 'delete',
//						key: name,
//						value: old
//					});
//				}
//
//				if (value !== undefined) {
//					changes.push({
//						action: 'set',
//						key: name,
//						value: value
//					});
//				}
			}

			// We are setting some other key
			else {
				target[name] = value;
				return true;
			}

//console.log(JSON.stringify(change));

			var observers = target[$observers][$update];

			// If there are no observers there's nothing to notify
			if (!observers) { return true; }

//			if (!target[$queued]) {
//				target[$queued] = true;
//				requestTick(function() {
					// Todo: What happens if observers are removed during this operation?
					var n = -1;
					while (observers[++n]) {
						observers[n](receiver/*, changes*/);
					}
					
					// Reset change record
//					changes.length = 0;
//					target[$queued] = false;
//				});
//			}

			return true;
		}
	};

	var objectHandlers = {
		get: function(target, name, self) {
			var value = target[name];
			// Ignore symbols
			return typeof name === 'symbol' ? value : Observable(value) ;
		},

		set: function(target, name, value, self) {
			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			target[name] = value;

			var observers = target[$observers][name];

			// If there are no observers there's nothing to notify
			if (!observers) { return true; }
			
			var observable = Observable(value);

//			if (!target[$queued]) {
//				target[$queued] = true;
//				requestTick(function() {
					// Todo: What happens if observers are removed during this operation?
					var n = -1;
					while (observers[++n]) {
						observers[n](observable);
					}

					// Reset change record
					//changes.length = 0;
//					target[$queued] = false;
//				});
//			}

			return true;
		}
	};

	function isArrayLike(object) {
		return typeof object === 'object' &&
			object.hasOwnProperty('length') &&
			typeof object.length === 'number' ;
	}

	function Observable(object) {
		if (!object || typeof object !== 'object') {
			return object;
		}

		if (object[$observable]) {
			return object[$observable];
		}

		object[$observers] = {};
		return (object[$observable] = new Proxy(object, isArrayLike(object) ?
			arrayHandlers :
			objectHandlers
		));
	}

	function observePrimitive(object, fn) {
		if (fn.value !== object) {
			fn(object);
			fn.value = object;
		}

		return noop;
	}

	function observeArray(array, fn) {
		var observers =
			array[$observers][$update] ||
			(array[$observers][$update] = []) ;		

		observers.push(fn);
		fn(array);

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
			var value = A.find.call(array, isMatch);
			unobserve();
			unobserve = observe(value, path, fn);
		}

		var unobserveArray = observeArray(object, update);

		return function() {
			unobserve();
			unobserveArray();
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
		if (object === undefined) {
			return observePrimitive(object, fn);
		}

		if (!path.length) {
			return isArrayLike(object) ?
				observeArray(object, fn) :
				observePrimitive(object, fn) ;
		}

		rname.lastIndex = 0;
		var tokens = rname.exec(path);

		if (!tokens) {
			throw new Error('Observable: invalid path "' + path + '"');
		}

//console.log(path, [tokens[1], tokens[3]].join(': '));

		var name  = tokens[1];
		var match = tokens[3];
		path = path.slice(rname.lastIndex);

		return match ?
			observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) ;
	}

	window.Observable = Observable;

	window.observe = observe;

})(this);
