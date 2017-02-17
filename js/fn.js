(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Fn     – https://github.com/stephband/fn');
})(this);

(function(window) {
	"use strict";


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;

	var debug = true;


	// Define

	var empty = Object.freeze(Object.defineProperties([], {
		shift: { value: noop }
	}));

	// Constant for converting radians to degrees
	var angleFactor = 180 / Math.PI;


	// Feature test

	var isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();

	function setFunctionProperties(string, parity, fn1, fn2) {
		// Make the string representation of fn2 display parameters of fn1
		fn2.toString = function() {
			return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + string + '] }';
		};

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		if (isFunctionLengthDefineable) {
			Object.defineProperty(fn2, 'length', { value: parity });
		}
	}


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function call(fn) {
		return fn();
	}

	function invoke(n, fn) {
		return fn(n);
	}

	function bind(params, fn) {
		return function() {
			fn.apply(this, concat(arguments, params));
		};
	}

	function compose(fn2, fn1) {
		return function composed(n) {
			return fn2(fn1(n));
		};
	}

	function pipe() {
		var a = arguments;
		return function piped(n) {
			return A.reduce.call(a, invoke, n);
		};
	}

	function cache(fn) {
		var map = new Map();

		function cached(object) {
			if (arguments.length !== 1) {
				throw new Error('Fn: Cached function called with ' + arguments.length + ' arguments. Accepts exactly 1.');
			}

			if (map.has(object)) {
				return map.get(object);
			}

			var result = fn(object);
			map.set(object, result);
			return result;
		}

		if (debug) {
			setFunctionProperties('cached function', 1, fn, cached);
		}

		return cached;
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		if (parity < 2) { return fn; }

		var curried = function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function. And curry that. The param is
				// declared so that partial has length 1.
				curry(function partial(param) {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		};

		if (debug) {
			setFunctionProperties('curried function', parity, fn, curried);
		}

		return curried;
	}

	function cacheCurry(fn, parity) {
		parity = parity || fn.length;

		if (parity < 2) { return cache(fn); }

		var memo = cache(function partial(object) {
			return cacheCurry(function() {
				var params = [object];
				A.push.apply(params, arguments);
				return fn.apply(null, params);
			}, parity - 1) ;
		});

		// For convenience, allow curried functions to be called as:
		// fn(a, b, c)
		// fn(a)(b)(c)
		// fn(a, b)(c)
		function curried() {
			return arguments.length > 1 ?
				memo(arguments[0]).apply(null, A.slice.call(arguments, 1)) :
				memo(arguments[0]) ;
		}

		if (debug) {
			setFunctionProperties('cached and curried function', parity, fn, curried);
		}

		return curried;
	}

	//function curryUntil(fn, test) {
	//	// Returns partially applied functions until some condition `test`
	//	// is met, when `fn` is called
	//	return function curried() {
	//		return test.apply(null, arguments) ?
	//			fn.apply(null, arguments) :
	//			bind(arguments, curried) ;
	//	};
	//}

	function flip(fn) {
		return function(a, b) {
			return fn(b, a);
		};
	}

	function overloadLength(object) {
		return function overload() {
			var length = arguments.length;
			var fn = object[length] || object.default;

			if (fn) {
				return fn.apply(this, arguments);
			}

			if (debug) { console.warn('Fn: method overload for ' + length + ' arguments not available'); }
			return this;
		}
	}

	function overloadTypes(object) {
		return function overload() {
			var types = A.map.call(arguments, toType).join(' ');
			var fn = object[types] || object.default;

			if (!fn) {
				console.warn('Fn: method overload for type (' + types + ') not available')
				return;
			}

			return fn.apply(this, arguments);
		};
	}


	// Types

	var regex = {
		url:       /^(?:\/|https?:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/,
		//url:       /^([a-z][\w\.\-\+]*\:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}/,
		email:     /^((([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^(-?\d+(?:\.\d+)?)$/,
		int:       /^(-?\d+)$/
	};

	function isDefined(value) {
		// !!value is a fast out for non-zero numbers, non-empty strings
		// and other objects, the rest checks for 0, '', etc.
		return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
	}

	function toType(object) {
		return typeof object;
	}

	function toClass(object) {
		return O.toString.apply(object).slice(8, -1);
	}

	function toArray(object) {
		return object.toArray ? object.toArray() :
			typeof object.length === "number" ? A.slice.apply(object) :
			[] ;
	}

	function toInt(object) {
		return parseInt(object, 10);
	}

	function toString(object) {
		return object.toString();
	}


	// Arrays

	function sortedSplice(array, fn, value) {
		// Splices value into array at position determined by result of fn,
		// where result is either in the range [-1, 0, 1] or [true, false]
		var n = array.length;
		while (n-- && fn(array[n], value) > 0);
		array.splice(++n, 0, value);
	}

	function sparseShift(array) {
		// Shift values ignoring undefined holes
		var value;
		while (array.length) {
			value = A.shift.apply(array);
			if (value !== undefined) { return value; }
		}
	}

	function uniqueReducer(array, value) {
		if (array.indexOf(value) === -1) { array.push(value); }
		return array;
	}

	function pushReducer(array, value) {
		array.push(value);
		return array;
	}

	function whileArray(fn, array) {
		var values = [];
		var n = -1;
		while (++n < array.length && fn(array[n])) {
			values.push(object[n]);
		}
		return values;
	}

	function last(fn, value) {
		var v = fn();
		return v === undefined ? value : last(fn, v) ;
	}

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}


	// Arrays and collections

	function concat(array2, array1) {
		// A.concat only works with arrays - it does not flatten array-like
		// objects. We need a robust concat that will glue any old thing
		// together.
		return Array.isArray(array1) ?
			// Both are arrays. Easy.
			Array.isArray(array2) ? array1.concat(array2) :
			// 1 is an array. Convert 2 to an array
			array1.concat(toArray(array2)) :
		// It's not an array but it has it's own concat method. Lets assume
		// it's robust.
		array1.concat ? array1.concat(array2) :
		// 1 is not an array, but 2 is
		Array.isArray(array2) ? toArray(array1).concat(array2) :
		// Neither are arrays
		toArray(array1).concat(toArray(array2)) ;
	}

	function contains(value, object) {
		return object.includes ?
			object.includes(value) :
		object.contains ?
			object.contains(value) :
		A.includes ?
			A.includes.call(object, value) :
			A.indexOf.call(object, value) !== -1 ;
	}

	var isIn = flip(contains);

	function map(fn, object) {
		return object.map ?
			object.map(fn) :
			A.map.call(object, fn) ;
	}

	function filter(fn, object) {
		return object.filter ?
			object.filter(fn) :
			A.filter.call(object, fn) ;
	}

	function reduce(fn, n, object) {
		return object.reduce ?
			object.reduce(fn, n) :
			A.reduce.call(object, fn, n);
	}

	function find(fn, object) {
		return object.find ? object.find(fn) : A.find.call(object, fn);
	}


	//function intersectScales(arr1, arr2) {
	//	// A fast intersect that assumes arrays are sorted (ascending) numbers.
	//	var l1 = arr1.length, l2 = arr2.length;
	//	var i1 = 0, i2 = 0;
	//	var arr3 = [];
	//
	//	while (i1 < l1 && i2 < l2) {
	//		if (arr1[i1] === arr2[i2]) {
	//			arr3.push(arr1[i1]);
	//			++i1;
	//			++i2;
	//		}
	//		else if (arr2[i2] > arr1[i1]) { ++i1; }
	//		else { ++i2; }
	//	}
	//
	//	return arr3;
	//}

	//function diffScales(arr1, arr2) {
	//	// A fast diff that assumes arrays are sorted (ascending) numbers.
	//	var l1 = arr1.length, l2 = arr2.length,
	//	    i1 = 0, i2 = 0,
	//	    arr3 = [], n;
	//
	//	while (i1 < l1) {
	//		while (i2 < l2 && arr1[i1] > arr2[i2]) {
	//			arr3.push(arr2[i2]);
	//			++i2;
	//		}
	//
	//		if (arr1[i1] !== arr2[i2]) {
	//			arr3.push(arr1[i1]);
	//		}
	//
	//		n = arr1[i1];
	//		while (n === arr1[i1] && ++i1 < l1);
	//		while (n === arr2[i2] && ++i2 < l2);
	//	}
	//
	//	while (i2 < l2) {
	//		arr3.push(arr2[i2]);
	//		++i2;
	//	}
	//
	//	return arr3;
	//}


	// Objects

	var rpathtrimmer  = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(['"]?\w+['"]?)/;

	function isObject(obj) { return obj instanceof Object; }

	function get(key, object) {
		return typeof object.get === "function" ?
			object.get(key) :
			// Coerse null to undefined
			object[key] === null ?
				undefined :
				object[key] ;
	}

	function set(key, value, object) {
		return typeof object.set === "function" ?
			object.set(key, value) :
			(object[key] = value) ;
	}

	function select(object, selector) {
		var selection = rpropselector.exec(selector);

		return selection ?
			findByProperty(object, selection[1], JSON.parse(selection[2])) :
			get(selector, object) ;
	}

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function objFrom(object, array) {
		var key = array.shift();
		var value = select(object, key);

		return array.length === 0 ? value :
			isDefined(value) ? objFrom(value, array) :
			value ;
	}

	function objTo(root, array, value) {
		var key = array.shift();

		if (array.length === 0) {
			set(key, value, root);
			return value;
		}

		var object = get(key, root);
		if (!isObject(object)) { object = {}; }

		set(key, object, root);
		return objTo(object, array, value) ;
	}


	// Strings

	function append(string1, string2) {
		return string2 + string1;
	}

	var prepend = flip(append);


	// Throttle

	// Returns a function that calls `fn` immediately the first time it is
	// called, and thereafter once every `time` seconds during which function is
	// called, with the last context and arguments.

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance && window.performance.now ? function now() {
		return window.performance.now();
	} : function now() {
		return +new Date();
	} ;

	function createRequestTimerFrame(time) {
		var timer = false;
		var t = 0;
		var fns = [];

		function timed() {
			timer = false;
			t = now();
			fns.forEach(Fn.run([now()]));
			fns.length = 0;
		}

		return function requestTimerFrame(fn) {
			// Add fn to queue
			if (timer) {
				fns.push(fn);
				return;
			}

			var n = now();

			// Set the timer
			if (t + time > n) {
				fns.push(fn);
				timer = setTimeout(timed, time + t - n);
				return;
			}

			t = n;
			fn(t);
			return;
		};
	}

	function Throttle(fn, time) {
		var request = time ?
			createRequestTimerFrame(time * 1000) :
			requestAnimationFrame ;

		var queue = function() {
			// Don't queue update if it's already queued
			if (queued) { return; }
			queued = true;

			// Queue update
			request(update);
		};

		var queued, context, a;

		function update() {
			queued = false;
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		return throttle;
	}


	// Wait

	// Returns a function that waits for `time` seconds without being called
	// before calling `fn` with the last context and arguments passed to
	// function.

	function Wait(fn, time) {
		var timer;

		var queue = function() {
			clearTimeout(timer);
			// Set time in milliseconds
			timer = setTimeout(update, (time || 0) * 1000);
		};

		var context, a;

		function update() {
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			clearTimeout(timer);
		}

		function hold() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		hold.cancel = cancel;
		return hold;
	}


	// Fn

	function Fn(fn) {
		if (!this || !Fn.prototype.isPrototypeOf(this)) {
			return new Fn(fn);
		}

		var source = this;
		var buffer;

		if (!fn) {
			this.shift = noop;
			return;
		}

		if (typeof fn === "function") {
			this.shift = fn;
			return;
		}

		// fn is an object with a shift function
		if (typeof fn.shift === "function" && fn.length === undefined) {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var value = fn.shift();
				if (fn.status === "done") { source.status = 'done'; }
				return value;
			};
			return;
		}

		// fn is an iterator
		if (typeof fn.next === "function") {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var result = fn.next();
				if (result.done) { source.status = 'done'; }
				return result.value;
			};
			return;
		}

		// fn is an arguments object, maybe from Fn.of()
		if (Fn.toClass(fn) === "Arguments") {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var result = sparseShift(fn);
				if (result === undefined) { source.status = "done"; }
				return result;
			};
			return;
		}

		// fn is an array or array-like object
		buffer = A.slice.apply(fn);
		this.shift = function shift() {
			if (source.status === 'done') { return; }
			return buffer.shift();
		};
	}

	function create(object, fn) {
		var functor = Object.create(object);
		functor.shift = fn;
		functor.unshift = function(object) {};
		return functor;
	}

	Object.assign(Fn.prototype, {
		// Input

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},


		// Transform

		process: function(fn) { return fn(this); },

		ap: function ap(object) {
			var fn = this.shift();
			if (fn === undefined) { return; }
			return object.map(fn);
		},

		filter: function(fn) {
			var source = this;

			return create(this, function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
			});
		},

		map: function(fn) {
			return create(this, compose(function map(object) {
				return object === undefined ? undefined : fn(object) ;
			}, this.shift));
		},

		scan: function(fn, seed) {
			// seed defaults to 0
			seed = arguments.length > 1 ? seed : 0 ;
			var i = 0;
			return this.map(function scan(value) {
				return (seed = fn(seed, value, i++));
			});
		},

		reduce: function(fn, seed) {
			var output = isDefined(seed) ? seed : 0 ;
			var shift  = this.shift;

			// Todo: Is this the right way to detect the end? Really? When there
			// are no more defined values, rather than when status === "done"?
			return create(this, function reduce() {
				var value = shift();

				while (value !== undefined) {
					output = fn(output, value);
					value = shift();
				}

				return output;
			});
		},

		syphon: function(fn) {
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }

				var value;

				while ((value = shift()) !== undefined && fn(value)) {
					buffer2.push(value);
				}

				return value;
			};

			return create(this, function filter() {
				if (buffer2.length) { return buffer2.shift(); }

				var value;

				while ((value = shift()) !== undefined && !fn(value)) {
					buffer1.push(value);
				}

				return value;
			});
		},

		dedup: function() {
			var value;
			return this.filter(function(newValue) {
				var oldValue = value;
				value = newValue;
				return oldValue !== newValue;
			});
		},

		join: function() {
			var source = this;
			var buffer = empty;

			return create(this, function join(object) {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(object); }
				buffer = empty;
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		concat: function(object) {
			var source = this;
			return create(this, function concat() {
				var value = source.shift();

				if (value === undefined) {
					value = object.shift();
				}

				return value;
			});
		},

		sort: function(fn) {
			fn = fn || Fn.byGreater ;

			var source = this;
			var buffer = [];

			return create(this, function sort() {
				var value;

				while((value = source.shift()) !== undefined) {
					sortedSplice(buffer, fn, value);
				}

				return buffer.shift();
			});
		},

		head: function() {
			var source = this;

			return create(this, function head() {
				if (source.status === 'done') { return; }
				source.status = 'done';
				return source.shift();
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return create(this, function tail() {
				if (i++ === 0) { source.shift(); }
				return source.shift();
			});
		},

		last: function() {
			var source = this;

			return create(this, function() {
				return last(source.shift);
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = -1;

			return create(this, function slice() {
				while (++i < n) {
					source.shift();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.shift();
				}
			});
		},

		split: function(fn) {
			var source = this;
			var buffer = [];

			return create(this, function split() {
				var value = source.shift();
				var temp;

				if (value === undefined) {
					if (buffer.length) {
						temp = buffer;
						buffer = [];
						return temp;
					}

					return;
				}

				if (fn(value)) {
					temp = buffer;
					buffer = [value];
					return temp.length ? temp : split() ;
				}

				buffer.push(value);
				return split();
			});
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return create(this, n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
					var value, _buffer;

					while (buffer.length < n) {
						value = source.shift();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						_buffer = buffer;
						buffer = [];
						return Fn.of.apply(Fn, _buffer);
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				});
		},

		group: function(fn) {
			var source = this;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function group() {
				var array = [];
				var stream = Stream(function group() {
					if (!array.length) {
						// Pull until a new value is added to the current stream
						pullUntil(Fn.is(stream));
					}

					return array.shift();
				}, function push() {
					array.push.apply(array, arguments);
					this.notify('push');
				});

				buffer.push(stream);
				return stream;
			}

			function pullUntil(check) {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = group();
					streams.set(key, stream);
				}

				stream.push(value);
				return check(stream) || pullUntil(check);
			}

			function isBuffered() {
				return !!buffer.length;
			}

			return create(this, function group() {
				// Pull until a new stream is available
				pullUntil(isBuffered);
				return buffer.shift();
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return create(this, function unique() {
				var value = source.shift();
				if (value === undefined) { return; }

				if (values.indexOf(value) === -1) {
					values.push(value);
					return value;
				}

				return unique();
			});
		},


		// Timed

		delay: function(time) {
			var stream = Stream.Delay(time);
			return this.pipe(stream);
		},

		choke: function(time) {
			var stream = Stream.Choke(time);
			return this.pipe(stream);
		},

		throttle: function(time) {
			var stream = Stream.Throttle(time);
			return this.pipe(stream);
		},

		// Todo: Perhaps CueTimer should become part of Fn?
		cue: function(request, cancel, cuetime, map, test) {
			var source    = this;
			var cuestream = Stream.of();
			var startTime = -Infinity;
			var stopTime  = Infinity;
			var t1        = startTime;
			var value, mappedValue;

			function cue(time) {
				var t2 = time >= stopTime ? stopTime : time ;

				if (value === undefined) {
					while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
						cuestream.push(mappedValue);
						value = undefined;
					}
				}
				else {
					mappedValue = map(value);

					if (mappedValue !== undefined && test(t1, t2, mappedValue)) {
						cuestream.push(mappedValue);

						while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
							cuestream.push(mappedValue);
							value = undefined;
						}
					}
				}

				if (source.status === 'done') { return; }
				if (time === stopTime) { return; }

				t1 = startTime > time ? startTime : time ;
				request(cue);
			}

			cuestream.stop = function stop(time) {
				stopTime = time;
				if (stopTime <= t1) { cancel(cue); }
				return this;
			};

			cuestream.start = function start(time) {
				startTime = time;
				t1 = startTime;

				if (startTime >= cuetime()) {
					// This is ok even when cuetime() is -Infinity, because the
					// first request() goes through the timer synchronously, ie
					// immediately
					request(cue);
				}
				else {
					cue(cuetime());
				}

				return this;
			};

			return cuestream;
		},


		// Output

		next: function() {
			var value = this.shift();
			return {
				done: value === undefined,
				value: value
			};
		},

		pipe: function(stream) {
			// Target must be evented
			if (!stream || !stream.on) {
				throw new Error('Fn: Fn.pipe(object) object must be a stream. (' + stream + ')');
			}

			// Readable -> Writeable
			return stream
			.on('pull', this.shift)
			.push();
		},

		clone: function() {
			var shift = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			function fill() {
				var value = shift();
				if (value === undefined) { return; }
				buffer1.push(value);
				buffer2.push(value);
			}

			this.shift = function() {
				if (!buffer1.length) { fill(); }
				return buffer1.shift();
			};

			return create(this, function clone() {
				if (!buffer2.length) { fill(); }
				return buffer2.shift();
			});
		},

		tap: function(fn) {
			// Overwrite shift to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		each: function(fn) {
			var value = this.shift();

			while (value !== undefined) {
				fn(value);
				value = this.shift();
			}

			return this;
		},

		find: function(fn) {
			return this
			.filter(fn)
			.head()
			.shift();
		},

		toString: function() {
			return this.reduce(prepend, '').shift();
		},

		toJSON: function() {
			return this.reduce(pushReducer, []).shift();
		}
	});

	Fn.prototype.toArray = Fn.prototype.toJSON;

	if (window.Symbol) {
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}

	Object.assign(Fn, {
		of: function() { return new this(arguments); },

		empty:          empty,


		// Functional

		noop:           noop,
		id:             id,
		cache:          cache,
		curry:          curry,
		cacheCurry:     cacheCurry,
		compose:        compose,
		flip:           flip,
		pipe:           pipe,
		overloadLength: overloadLength,
		overloadTypes:  overloadTypes,

		bind: curry(bind),

		run: curry(function apply(values, fn) {
			return fn.apply(null, values);
		}),

		returnThis: function self() {
			console.warn('Fn.returnThis() has been renamed Fn.self()');
			return this;
		},

		self: function self() { return this; },


		// Logical

		and: curry(function and(a, b) { return !!(a && b); }),

		not: function not(a) { return !a; },

		or: curry(function or(a, b) { return a || b; }),

		xor: curry(function or(a, b) { return (a || b) && (!!a !== !!b); }),


		// Comparison

		equals: curry(function equals(a, b) {
			// Fast out if references are for the same object.
			if (a === b) { return true; }

			if (typeof a !== 'object' || typeof b !== 'object') { return false; }

			var akeys = Object.keys(a);
			var bkeys = Object.keys(b);

			if (akeys.length !== bkeys.length) { return false; }

			var n = akeys.length;

			while (n--) {
				if (!equals(a[akeys[n]], b[akeys[n]])) {
					return false;
				}
			}

			return true;
		}),

		is: curry(function is(a, b) { return a === b; }),

		isIn: curry(isIn),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),

		by: curry(function by(property, a, b) {
			return byGreater(a[property], b[property]);
		}),

		byGreater: curry(byGreater),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),


		// Types

		isDefined: isDefined,
		toType:    toType,
		toClass:   toClass,
		toArray:   toArray,
		toString:  toString,
		toInt:     toInt,
		toFloat:   parseFloat,

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its text content.
				var n = -1;

				// Test regexable string types
				while (++n < types.length) {
					if(regex[types[n]].test(string)) {
						return types[n];
					}
				}

				// Test for JSON
				try {
					JSON.parse(string);
					return 'json';
				}
				catch(e) {}

				// Default to 'string'
				return 'string';
			};
		})(regex, ['date', 'url', 'email', 'int', 'float']),


		// Collections

		diff: curry(function diff(array, object) {
			var values = toArray(array);

			return filter(function(value) {
				var i = values.indexOf(value);
				if (i === -1) { return true; }
				values.splice(i, 1);
				return false;
			}, object)
			.concat(values);
		}),

		concat: curry(concat),

		contains: curry(contains),

		each: curry(function each(fn, object) {
			// A stricter version of .forEach, where the callback fn
			// gets only one argument.
			return object && (
				typeof object.each === 'function' ? object.each(fn) :
				object.forEach ? object.forEach(function(item) { fn(item); }) :
				A.forEach.call(object, function(item) { fn(item); })
			);
		}),

		filter: curry(filter),

		find: curry(find),

		intersect: curry(function intersect(array, object) {
			var values = toArray(array);

			return filter(function(value) {
				var i = values.indexOf(value);
				if (i === -1) { return false; }
				values.splice(i, 1);
				return true;
			}, object);
		}),

		map: curry(map),

		//push: curry(push),

		reduce: curry(reduce),

		slice: curry(function slice(n, m, object) { return object.slice ? object.slice(n, m) : A.slice.call(object, n, m); }),

		sort: curry(function sort(fn, object) { return object.sort ? object.sort(fn) : A.sort.call(object, fn); }),

		unite: curry(function unite(array, object) {
			var values = toArray(array);

			return map(function(value) {
				var i = values.indexOf(value);
				if (i > -1) { values.splice(i, 1); }
				return value;
			}, object)
			.concat(values);
		}),

		unique: function unique(object) {
			return object.unique ?
				object.unique() :
				reduce(uniqueReducer, [], object) ;
		},

		while: curry(function(fn, object) {
			return object.while ?
				object.while(fn) :
				whileArray(fn, object) ;
		}),


		// Objects

		assign: curry(Object.assign, 2),

		entries: function(object){
			return typeof object.entries === 'function' ?
				object.entries() :
				A.entries.apply(object) ;
		},

		keys: function(object){
			return typeof object.keys === 'function' ?
				object.keys() :

				/* Don't use Object.keys(), it returns an array,
				   not an iterator. */
				A.keys.apply(object) ;
		},

		values: function(object){
			return typeof object.values === 'function' ?
				object.values() :
				A.values.apply(object) ;
		},

		get: curry(get),

		set: curry(set),

		getPath: curry(function get(path, object) {
			return object && (object.get ? object.get(path) :
				typeof path === 'number' ? object[path] :
				path === '' || path === '.' ? object :
				objFrom(object, splitPath(path))) ;
		}),

		setPath: curry(function set(path, value, object) {
			if (object.set) { object.set(path, value); }
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		invoke: curry(function invoke(name, args, object) {
			return object[name].apply(object, args);
		}),


		// Time

		throttle: function(time, fn) {
			// Overload the call signature to support Fn.throttle(fn)
			if (fn === undefined && time.apply) {
				fn = time;
				time = undefined;
			}

			function throttle(fn) {
				return Throttle(fn, time);
			}

			// Where fn not given return a partially applied throttle
			return fn ? throttle(fn) : throttle ;
		},

		requestTick: (function(promise) {
			return function(fn) {
				promise.then(fn);
			};
		})(Promise.resolve()),


		// Numbers

		randomGaussian: function randomGaussian(n) {
			// Returns a random number with a bell curve probability centred
			// around 0 with limits -n to n.
			return n * (Math.random() + Math.random() - 1);
		},

		add:      curry(function add(a, b) { return b + a; }),

		multiply: curry(function multiply(a, b) { return b * a; }),

		mod:      curry(function mod(a, b) { return b % a; }),

		pow:      curry(function pow(a, b) { return Math.pow(b, a); }),

		min:      curry(function min(a, b) { return a > b ? b : a ; }),

		max:      curry(function max(a, b) { return a < b ? b : a ; }),

		limit:    curry(function limit(min, max, n) { return n > max ? max : n < min ? min : n ; }),

		wrap:     curry(function wrap(min, max, n) { return (n < min ? max : min) + (n - min) % (max - min); }),

		degToRad: function toDeg(n) { return n / angleFactor; },

		radToDeg: function toRad(n) { return n * angleFactor; },

		toPolar:  function setPolar(cartesian) {
			var x = cartesian[0];
			var y = cartesian[1];

			return [
				// Distance
				x === 0 ?
					Math.abs(y) :
				y === 0 ?
					Math.abs(x) :
					Math.sqrt(x*x + y*y) ,
				// Angle
				Math.atan2(x, y)
			];
		},

		toCartesian: function setCartesian(polar) {
			var d = polar[0];
			var a = polar[1];

			return [
				Math.sin(a) * d ,
				Math.cos(a) * d
			];
		},

		// conflicting properties not allowed in strict mode
		// log:         curry(function log(base, n) { return Math.log(n) / Math.log(base); }),
		nthRoot:     curry(function nthRoot(n, x) { return Math.pow(x, 1/n); }),

		gcd: function gcd(a, b) {
			// Greatest common divider
			return b ? gcd(b, a % b) : a ;
		},

		lcm: function lcm(a, b) {
			// Lowest common multiple.
			return a * b / Fn.gcd(a, b);
		},

		factorise: function factorise(n, d) {
			// Reduce a fraction by finding the Greatest Common Divisor and
			// dividing by it.
			var f = Fn.gcd(n, d);
			return [n/f, d/f];
		},

		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),

		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),

		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog:    curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(n / min) / Math.log(max / min))
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},


		// Strings

		append:      curry(append),
		prepend:     curry(prepend),

		match:       curry(function match(regex, string) { return regex.test(string); }),

		exec:        curry(function parse(regex, string) { return regex.exec(string) || undefined; }),

		replace:     curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},


		// JSON

		stringify: function stringify(object) {
			return JSON.stringify(Fn.toClass(object) === "Map" ?
				Fn(object) :
				object
			);
		},


		// Debugging

		log: curry(function(text, object) {
			console.log(text, object);
			return object;
		}),

		logReturn: function(fn) {
			return function() {
				var result = fn.apply(this, arguments);
				console.log(fn.name, result);
				return result;
			};
		}
	});


	// Stream

	var defaults = {
		stop: function stop() {
			// Get rid of all event handlers in one fell swoop
			this.stream.status = "done";
			notify(this.stream, 'stop');
			delete this.stream[eventsSymbol];
			return this;
		}
	};

	var eventsSymbol = Symbol('events');

	function notify(object, type) {
		var events = object[eventsSymbol];

		if (!events) { return; }

		// Todo: make sure forEach is acting on a copy of events[type] ?
		//events && events[type] && events[type].forEach(call);

		if (!events[type]) { return; }

		var n = -1;
		var l = events[type].length;
		var value;

		while (++n < l) {
			value = events[type][n]();
			if (value !== undefined) {
				return value;
			}
		}
	}

	function Context(stream) {
		this.stream = stream;
	}

	Context.prototype.notify = function(type) {
		return notify(this.stream, type);
	};

	function mixinFnStream(shift, push, stop) {
		// Avoid exposing notify() by creating a lifecycle control object
		// and use it as context for shift, push and stop.
		var context = new Context(this);

		this.shift = shift.bind(context);

		this.push = function() {
			push && push.apply(context, arguments);
			// Todo: May not return the object we're expecting, when push is detached from this!!
			return this;
		};

		this.stop = function() {
			stop && stop.apply(context, arguments);
			return this;
		};
	}

	function mixinBufferStream(array) {
		var stream = this;
		var buffer = A.slice.apply(array);

		this.shift = function shift() {
			if (stream.status === "done") { return; }

			var value = sparseShift(buffer);

			if (value === undefined) {
				value = notify(stream, 'pull');
			}

			return value;
		};

		this.push = function push() {
			if (stream.status === "done") { return; }
			A.push.apply(buffer, arguments);
			notify(stream, 'push');
			return this;
		};

		this.stop = function() {
			stream.status = "done";
			return this;
		};
	}

	function Stream(shift, push, stop) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(shift, push, stop);
		}

		// Require at least one parameter
		if (!shift) {
			throw new TypeError('Stream constructor requires at least 1 parameter');
		}

		if (typeof shift === 'function') {
			mixinFnStream.call(this, shift, push, stop || defaults.stop);
		}
		else if (typeof shift.length === "number") {
			mixinBufferStream.call(this, shift);
		}

		this[eventsSymbol] = {};
	}

	Stream.prototype = Object.create(Fn.prototype);

	Object.assign(Stream.prototype, {
		on: function on(type, fn) {
			var events = this[eventsSymbol];
			if (!events) { return this; }

			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function off(type, fn) {
			var events = this[eventsSymbol];
			if (!events) { return this; }

			// Remove all handlers for all types
			if (arguments.length === 0) {
				Object.keys(events).forEach(off, this);
				return this;
			}

			var listeners = events[type];
			if (!listeners) { return; }

			// Remove all handlers for type
			if (!fn) {
				delete events[type];
				return this;
			}

			// Remove handler fn for type
			var n = listeners.length;
			while (n--) {
				if (listeners[n] === fn) { listeners.splice(n, 1); }
			}

			return this;
		},

		ap: function ap(object) {
			var shift = this.shift;

			return create(this, function ap() {
				var fn = shift();
				if (fn === undefined) { return; }
				return object.map(fn);
			});
		},

		pipe: function(stream) {
			// Target must be writable
			if (!stream || !stream.push) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}

			// As a rule, notify should never be called from outside
			// stream methods...
			//
			//this.on('push', function() {
			//	return notify(stream, 'push');
			//});

			var source = this.on('push', stream.push);

			stream.on('stop', function() {
				source.off('push', stream.push);
			});

			// Delegate to Fn pipe()
			return Fn.prototype.pipe.apply(this, arguments);
		},

		push: function error() {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		unshift: function(object) {

		},

		reduce: function(fn, seed) {
			var output = isDefined(seed) ? seed : 0 ;
			var shift  = this.shift;

			return create(this, function reduce() {
				var value = shift();

				// If there are no new values to reduce, return
				if (value === undefined) { return; }

				while (value !== undefined) {
					output = fn(output, value);
					value = shift();
				}

				return output;
			});
		},

		each: function(fn) {
			var source = this;
			var args = arguments;

			function each() {
				// Delegate to Fn.each(), which returns self, telling the
				// notifier that this event has been handled.
				return Fn.prototype.each.apply(source, args);
			}

			// Flush and observe
			each();
			return this.on('push', each);
		},

		concatParallel: function() {
			var shift = this.shift;
			var order = [];

			function bind(object) {
				order.push(object);

				if (!object.on) { return; }

				object.on('push', function() {
					// Return a value to indicate this event has been handled.
					// For convenience, lets use the return of array.push().
					return order.push(object);
				});
			}

			function shiftNext() {
				var stream = order.shift();
				if (stream === undefined) { return; }
				var value = stream.shift();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return create(this, function concatParallel() {
				var object = shift();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		toPromise: function() {
			var source = this;

			return new Promise(function setup(resolve, reject) {
				var value = source.shift();

				if (value !== undefined) {
					resolve(value);
					return;
				}

				source
				.on('push', function push() {
					var value = source.shift();
					if (value === undefined) { return; }

					resolve(value);
					source.off('push', push);

					// Return a value to indicate this push event
					// has been handled
					return true;
				})
				.on('stop', reject);
			});
		}
	});

	Object.assign(Stream, {
		of: Fn.of,

		Throttle: function ThrottleStream(duration) {
			var buffer = [];

			function shift() {
				return buffer.shift();
			}

			var throttle = Throttle(function push() {
				// Maintain buffer with length 1, containing last pushed value
				buffer[0] = arguments[arguments.length - 1];
				this.notify('push');
			}, duration);

			return Stream(shift, throttle, function stop() {
				buffer.length = 0;
				throttle.cancel();
				this.status = "done";
			});
		},

		Choke: function ChokeStream(duration) {
			var buffer1 = [];
			var buffer2 = [];
			var timer;

			// Where duration is falsy default to animation frames

			var request = duration ?
				function request(fn) { setTimeout(fn, duration * 1000); } :
				requestAnimationFrame;

			var cancel = duration ?
				clearTimeout :
				cancelAnimationFrame;

			function shift() {
				return buffer2.shift();
			}

			function push(stream) {
				if (!buffer1.length) {
					timer = undefined;
					return;
				}

				buffer2.push(buffer1.shift());
				stream.notify('push');
				timer = request(function() { push(stream); });
			}

			function flow() {
				buffer1.push.apply(buffer1, arguments);
				if (timer === undefined) { push(this); }
			}

			return Stream(shift, flow, function stop() {
				buffer2.length = 0;
				cancel(timer);
				this.status = "done";
			});
		},

		Delay: function DelayStream(duration) {
			var buffer = [];
			var timers = [];

			function shift() {
				return buffer.shift();
			}

			function push(context, values) {
				// Careful! We're assuming that timers fire in the order they
				// were declared, which may not be the case in JS.
				var value;

				if (values.length) {
					buffer.push.apply(buffer, values);
				}
				else {
					value = context.notify('pull');
					if (value === undefined) { return; }
					buffer.push(value);
				}

				context.notify('push');
				clearTimeout(timers.shift());
			}

			function delay() {
				timers.push(
					setTimeout(push, duration * 1000, this, arguments)
				);
			}

			return Stream(shift, delay, function stop() {
				buffer.length = 0;
				timers.forEach(clearTimeout);
				this.status = "done";
			});
		}
	});


	// Pool

	var loggers = [];

	function Pool(options, prototype) {
		var create = options.create || Fn.noop;
		var reset  = options.reset  || Fn.noop;
		var isIdle = options.isIdle;
		var store = [];

		// Todo: This is bad! It keeps a reference to the pools hanging around,
		// accessible from the global scope, so even if the pools are forgotten
		// they are never garbage collected!
		loggers.push(function log() {
			var total = store.length;
			var idle  = store.filter(isIdle).length;
			return {
				name:   options.name,
				total:  total,
				active: total - idle,
				idle:   idle
			};
		});

		return function PooledObject() {
			var object = store.find(isIdle);

			if (!object) {
				object = Object.create(prototype || null);
				create.apply(object, arguments);
				store.push(object);
			}

			reset.apply(object, arguments);
			return object;
		};
	}

	Pool.snapshot = function() {
		return Fn(loggers).map(call).toJSON();
	};


	// Export

	Object.assign(Fn, {
		Pool:          Pool,
		Throttle:      Throttle,
		Wait:          Wait,
		Stream:        Stream
	});

	window.Fn = Fn;
})(this);
