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

	function apply(args, fn) {
		fn.apply(null, args);
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

	function partial(fn) {
		var fns = arguments;

		return fns.length === 1 ?
			curry(fn) :
			curry(function() {
				var args, args1, args2;

				if (arguments.length > fn.length) {
					args1 = A.slice.call(arguments, 0, fn.length);
					args2 = A.slice.call(arguments, fn.length);
					args = concat(args2, fn.apply(this, args1));
				}
				else {
					args = fn.apply(this, arguments);
				}

				return fns.length === 2 && args.length >= fns[1].length ?
					// A quick out when we don't need to re-curry
					fns[1].apply(null, args) :
					// A new partial
					partial
					.apply(null, A.slice.call(fns, 1))
					.apply(null, args) ;
			}, fn.length) ;
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

	function once(fn) {
		return function once() {
			var value = fn.apply(this, arguments);
			fn = noop;
			return value;
		};
	}

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
		float:     /^[+-]?(?:\d*\.)?\d+$/,
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
		if (object.toArray) { return object.toArray(); }
		
		// Speed test for array conversion:
		// https://jsperf.com/nodelist-to-array/27

		var array = [];
		var l = object.length;
		var i;

		if (typeof object.length !== 'number') { return array; }

		array.length = l;

		for (i = 0; i < l; i++) {
			array[i] = object[i];
		}

		return array;
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
		var n = sortIndex(array, function(n) {
			return fn(value, n);
		});
		array.splice(n, 0, value);
	}

	function sortIndex(array, fn) {
		var l = array.length;
		var n = l + l % 2;
		var i = 0;

		while ((n = Math.floor(n / 2)) && (i + n <= l)) {
			if (fn(array[i + n - 1]) >= 0) {
				i += n;
				n += n % 2;
			}
		}

		return i;
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

	function concat(array2, array1) {
		// A.concat only works with arrays - it does not flatten array-like
		// objects. We need a robust concat that will glue any old thing
		// together.
		return Array.isArray(array1) ?
			// 1 is an array. Convert 2 to an array if necessary
			array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

		array1.concat ?
			// It has it's own concat method. Lets assume it's robust
			array1.concat(array2) :
		// 1 is not an array, but 2 is
		toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
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


	// Objects

	var assign = Object.assign;

	var rpathtrimmer  = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(['"]?\w+['"]?)/;

	function isObject(obj) { return obj instanceof Object; }

	function get(key, object) {
		return object && (typeof object.get === "function" ?
			object.get(key) :
			// Coerse null to undefined
			object[key] === null ?
				undefined :
				object[key]
		);
	}

	function set(key, object, value) {
		return typeof object.set === "function" ?
			object.set(key, value) :
			(object[key] = value) ;
	}

	function select(object, selector) {
		var selection = rpropselector.exec(selector);

		return selection ?
			findByProperty(selection[1], object, JSON.parse(selection[2])) :
			get(selector, object) ;
	}

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(name, array, value) {
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
			set(key, root, value);
			return value;
		}

		var object = get(key, root);
		if (!isObject(object)) { object = {}; }

		set(key, root, object);
		return objTo(object, array, value) ;
	}


	// Strings

	function prepend(string1, string2) {
		return string1 + string2;
	}

	function append(string1, string2) {
		return string2 + string1;
	}


	// Numbers

	function sampleCubicBezier(a, b, c, t) {
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
		return ((a * t + b) * t + c) * t;
	}
	
	function sampleCubicBezierDerivative(a, b, c, t) {
		return (3 * a * t + 2 * b) * t + c;
	}

	function solveCubicBezierX(a, b, c, x, epsilon) {
		// Solve x for a cubic bezier
		var x2, d2, i;
		var t2 = x;

		// First try a few iterations of Newton's method -- normally very fast.
		for(i = 0; i < 8; i++) {
			x2 = sampleCubicBezier(a, b, c, t2) - x;
			if (Math.abs(x2) < epsilon) {
				return t2;
			}
			d2 = sampleCubicBezierDerivative(a, b, c, t2);
			if (Math.abs(d2) < 1e-6) {
				break;
			}
			t2 = t2 - x2 / d2;
		}

		// Fall back to the bisection method for reliability.
		var t0 = 0;
		var t1 = 1;

		t2 = x;

		if(t2 < t0) { return t0; }
		if(t2 > t1) { return t1; }

		while(t0 < t1) {
			x2 = sampleCubicBezier(a, b, c, t2);
			if(Math.abs(x2 - x) < epsilon) {
				return t2;
			}
			if (x > x2) { t0 = t2; }
			else { t1 = t2; }
			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	}


	// Time

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance && window.performance.now ? function now() {
		// Return time in seconds
		return window.performance.now() / 1000;
	} : function now() {
		// Return time in seconds
		return +new Date() / 1000;
	} ;

	var resolved = Promise.resolve();

	function requestTick(fn) {
		resolved.then(fn);
		return true;
	}

	function Timer(time) {
		// Optional second argument is a function that returns
		// time (in seconds)
		var getTime = arguments[1] || now;
		var fns = [];
		var timer = false;
		var t = 0;

		function update() {
			var fn;
			timer = false;
			t     = getTime();
			while (fn = fns.shift()) {
				fn(t);
			}
		}

		return {
			request: function requestTimerFrame(fn) {
				// Add fn to queue
				fns.push(fn);
				
				// If the timer is cued do nothing
				if (timer) { return; }
				
				var n = getTime();

				// Set the timer and return something truthy
				return (timer = t + time > n ?
					setTimeout(update, (time + t - n) * 1000) :
					requestTick(update)
				);
			},

			cancel: noop
		};
	}


	// Throttle
	//
	// Returns a function that calls `fn` once on the next timer frame, using
	// the context and arguments from the latest invocation.

	function Throttle(fn, request) {
		request = request || requestAnimationFrame;

		var queue = schedule;
		var context, args;

		function schedule() {
			queue = noop;
			request(update);
		}

		function update() {
			queue = schedule;
			fn.apply(context, args);
		}

		function stop(callLast) {
			// If there is an update queued apply it now
			if (callLast !== false && queue === noop) { update(); }

			// Don't permit further changes to be queued
			queue = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = stop;
		return throttle;
	}


	// Wait
	//
	// Returns a function that waits for `time` seconds without being invoked
	// before calling `fn` using the context and arguments from the latest
	// invocation

	function Wait(fn, time) {
		var timer, context, args;

		function cue() {
			if (timer) { clearTimeout(timer); }
			timer = setTimeout(update, (time || 0) * 1000);
		}

		function update() {
			timer = false;
			fn.apply(context, args);
		}

		function cancel() {
			// Don't permit further changes to be queued
			schedule = noop;

			// If there is an update queued apply it now
			if (timer) { clearTimeout(timer); }
		}

		function wait() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Cue the update
			cue();
		}

		wait.cancel = cancel;
		return wait;
	}


	// Fn

	function create(object, fn) {
		var functor = Object.create(object);
		functor.shift = fn;
		//functor.unshift = function(object) {};
		return functor;
	}

	function cloneShift(buffer1, buffer2, shift) {
		return function clone() {
			if (buffer1.length) { return buffer1.shift(); }
			var value = shift();
			if (value !== undefined) { buffer2.push(value); }
			return value;
		};
	}

	function notifyPush() {
		this.notify('push');
	}

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
				var value = fn.shift();
				if (fn.status === "done" || fn.length === 0) { source.status = 'done'; }
				return value;
			};
			return;
		}

		// fn is an iterator
		if (typeof fn.next === "function") {
			this.shift = function shift() {
				var result = fn.next();
				if (result.done) { source.status = 'done'; }
				return result.value;
			};
			return;
		}

		// fn is an array or array-like object. Iterate over it.
		var i = -1;
		this.shift = function shift() {
			if (++i >= fn.length - 1) {
				source.status = 'done';
				return fn[i];
			}

			// Ignore holes
			return fn[i] === undefined ? shift() : fn[i] ;
		};
	}

	assign(Fn.prototype, {
		// Input

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},

		// Transform

		ap: function(object) {
		  var shift = this.shift;
		
		  return create(this, function ap() {
		  	var fn = shift();
		  	return fn === undefined ?
		  		undefined :
		  		object.map(fn);
		  });
		},

		buffer: function() {
			// Create an unshift buffer, such that objects can be inserted
			// back into the stream at will with stream.unshift(object).
			var source = this;
			var array  = [];

			this.unshift = function(object) {
				if (object === undefined) { return; }
				array.unshift(object);
			};

			return create(this, function buffer() {
				return array.length ? array.shift() : source.shift() ;
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		clone: function() {
			var buffer1 = [];
			var buffer2 = [];
			this.shift = cloneShift(buffer1, buffer2, this.shift);
			return new Fn(cloneShift(buffer2, buffer1, this.shift));
		},

		concat: function() {
			var sources = Fn(arguments);
			var source = this;

			return create(this, function concat() {
				if (source === undefined) { return; }

				var value = source.shift();

				if (value === undefined) {
					source = sources.shift();
					return concat();
				}

				return value;
			});
		},

		dedup: function() {
			var v;
			return this.filter(function(value) {
				var old = v;
				v = value;
				return old !== value;
			});
		},

		filter: function(fn) {
			var source = this;

			return create(this, function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
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

		head: function() {
			var source = this;

			return create(this, function head() {
				if (source.status === 'done') { return; }
				source.status = 'done';
				return source.shift();
			});
		},

		join: function() {
			var source = this;
			var buffer = empty;

			return create(this, function join() {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(); }
				buffer = empty;
			});
		},

		last: function() {
			var source = this;

			return create(this, function() {
				return last(source.shift);
			});
		},

		map: function(fn) {
			return create(this, compose(function map(object) {
				return object === undefined ? undefined : fn(object) ;
			}, this.shift));
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

		fold: function(fn, seed) {
			// seed defaults to 0
			seed = arguments.length > 1 ? seed : 0 ;
			var i = 0;
			return this.map(function(value) {
				seed = fn(seed, value, i++);
				return seed;
			});
		},

		reduce: function(fn, seed) {
			return this.fold(fn, seed).last();
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

		tail: function() {
			var source = this;
			var i = 0;

			return create(this, function tail() {
				if (i++ === 0) { source.shift(); }
				return source.shift();
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

		unique: function() {
			var source = this;
			var values = [];

			return create(this, function unique() {
				var value = source.shift();
				return value === undefined ? undefined :
					values.indexOf(value) === -1 ? values.push(value) && value :
					unique() ;
			});
		},

		// Hack needed for soundio, I think. Keep an eye on whether we
		// can remove it.
		process: function(fn) { return fn(this); },

		// Time transforms

		choke: function(time) {
			return this.pipe(Stream.Choke(time));
		},

		delay: function(time) {
			return this.pipe(Stream.Delay(time));
		},

		throttle: function(request) {
			return this.pipe(Stream.Throttle(request));
		},

		timer: function(request) {
			return this.pipe(Stream.Timer(request));
		},

		// Consumers

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

			return stream.on('pull', this.shift);
		},

		toJSON: function() {
			return this.reduce(pushReducer, []).shift();
		},

		toString: function() {
			return this.reduce(prepend, '').shift();
		}
	});

	Fn.prototype.toArray = Fn.prototype.toJSON;

	if (window.Symbol) {
		// A functor is it's own iterator
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}

	assign(Fn, {
		of: function() { return new this(arguments); },
		from: function(object) { return new this(object); },

		merge: function() {
			// Merge multiple streams into one
		},

		combine: function() {
			
		}
	});


	// Stream

	var eventsSymbol = Symbol('events');

	// A Lifecycle controller for streams
	function Control(stream) {
		this.stream = stream;
	}

	assign(Control.prototype, {
		notify: function(type) {
			var events = this.stream[eventsSymbol];
	
			if (!events) { return; }
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
		},

		stop: function stop() {
			// Get rid of all event handlers in one fell swoop
			this.stream.status = 'done';
			this.notify('stop');
			delete this.stream[eventsSymbol];
		}
	});

	function BufferStream(array) {
		if (typeof array.length !== 'number') {
			throw new TypeError('BufferStream requires 1st parameter to be an array or array-like object.');
		}

		var buffer = A.slice.apply(array);

		return new Stream(function shift() {
			var value = sparseShift(buffer);
			return value === undefined ?
				this.notify('pull') :
				value ;
		}, function push() {
			A.push.apply(buffer, arguments);
			this.notify('push');
		});
	}

	function Stream(shift, push, stop) {
		// Stream has been called with a single array-like parameter
		if (typeof shift !== 'function') {
			return BufferStream(shift);
		}

		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(shift, push, stop);
		}

		// A lifecycle control object to use as context for shift, push and
		// stop, giving those functions access to flow control for the stream.
		var control = new Control(this);
		var stream = this;

		stop = stop || control.stop;
		push = push || noop;

		this.shift = function() {
			return shift.apply(control);
		};

		this.push = function() {
			push.apply(control, arguments);
			return stream;
		};

		this.stop = function() {
			stop.apply(control, arguments);
			return stream;
		};

		this[eventsSymbol] = {};
	}

	Stream.prototype = Object.create(Fn.prototype);

	assign(Stream.prototype, {
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

		clone: function() {
			var source     = this;
			var buffer1    = [];
			var buffer2    = [];
			var stream = Stream(
				cloneShift(buffer2, buffer1, this.shift),
				notifyPush,
				function stop() {
					source.off('push', push);
					source.off('stop', stop);
					this.stop();
				}
			);

			// Wrapper functions, because we have made the notifications system
			// dependent on return value, a little stupidly perhaps, and we
			// don't want return values here.
			function push() {
				stream.push();
			}

			function stop() {
				stream.stop();
			}

			this.shift = cloneShift(buffer1, buffer2, this.shift);
			this.on('push', push);
			this.on('stop', stop);
			return stream;
		},

		pipe: function(stream) {
			// Target must be writable
			if (!stream || !stream.push) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}
			
			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},

		each: function(fn) {
			var args   = arguments;
			var source = this;

			// Flush and observe
			Fn.prototype.each.apply(source, args);

			return this.on('push', function each() {
				// Delegate to Fn.each(). That returns self, which is truthy,
				// so telling the notifier that this event has been handled.
				Fn.prototype.each.apply(source, args);
			});
		},

		merge: function() {
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

			return create(this, function merge() {
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

	assign(Stream, {
		of: Fn.of,

		Choke: function(time) {
			var buffer  = [];

			return Stream(function shift() {
				return buffer.shift();
			}, Wait(function push() {
				buffer[0] = arguments[arguments.length - 1];
				this.notify('push');
			}, time), function stop() {
				throttle.cancel(false);
				this.stop();
			});
		},

		Delay: function DelayStream(duration) {
			var buffer = [];
			var timers = [];

			function trigger(context, values) {
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
				timers.shift();
			}

			return Stream(function shift() {
				return buffer.shift();
			}, function push() {
				timers.push(setTimeout(trigger, duration * 1000, this, arguments));
			}, function stop() {
				buffer = empty;
				timers.forEach(clearTimeout);
				this.stop();
			});
		},

		Throttle: function(request) {
			// If request is a number create a timer, otherwise if request is
			// a function use it, or if undefined, use an animation timer.
			request = typeof request === 'number' ? Timer(request).request :
				typeof request === 'function' ? request :
				requestAnimationFrame ;

			var buffer  = [];

			return Stream(function shift() {
				return buffer.shift();
			}, Throttle(function push() {
				buffer[0] = arguments[arguments.length - 1];
				this.notify('push');
			}, request), function stop() {
				buffer = empty;
				throttle.cancel(false);
				this.stop();
			});
		},

		Timer: function(request) {
			// If request is a number create a timer, otherwise if request is
			// a function use it, or if undefined, use an animation timer.
			request = typeof request === 'number' ? Timer(request).request :
				typeof request === 'function' ? request :
				requestAnimationFrame ;

			var buffer  = [];
			var pushed  = [];

			function update(control) {
				pushed[0] = buffer.shift();
				control.notify('push');
			}

			return Stream(function shift() {
				var value = pushed.shift();
				if (value !== undefined) {
					timer = request(function() { update(this); });
				}
				return value;
			}, function push() {
				buffer.push.apply(buffer, arguments);
				if (!timer) {
					timer = request(function() { update(this); });
				}
			}, function stop() {
				pushed = empty;
				update = noop;
				this.stop();
			});
		}
	});


	// Export

	window.Fn = assign(Fn, {

		// Constructors

		Stream:   Stream,
		Throttle: Throttle,
		Timer:    Timer,
		Wait:     Wait,


		// Functional

		empty:          empty,
		noop:           noop,
		id:             id,
		once:           once,
		cache:          cache,
		curry:          curry,
		cacheCurry:     cacheCurry,
		compose:        compose,
		flip:           flip,
		partial:        partial,
		pipe:           pipe,
		overloadLength: overloadLength,
		overloadTypes:  overloadTypes,

		apply: curry(apply),

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

		assign: curry(assign, 2),

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

		store: function(object) {
			// Creating a store using a weak map:
			// Fn.store(new WeakMap())

			return function store(key) {
				var object = store.get(key);
				if (object) { return object; }
				object = {};
				store.set(key, object);
				return object;
			};
		},


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

		requestTick: requestTick,


		// Numbers

		gaussian: function gaussian() {
			// Returns a random number with a bell curve probability centred
			// around 0 and limits -1 to 1.
			return Math.random() + Math.random() - 1;
		},

		add:      curry(function add(a, b) { return b + a; }),

		multiply: curry(function multiply(a, b) { return b * a; }),

		mod:      curry(function mod(a, b) { return b % a; }),

		pow:      curry(function pow(n, x) { return Math.pow(x, n); }),

		exp:      curry(function pow(n, x) { return Math.pow(n, x); }),

		log:      curry(function log(n, x) { return Math.log(x) / Math.log(n); }),

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

		// Cubic bezier function (originally translated from
		// webkit source by Christian Effenberger):
		// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

		cubicBezier: curry(function cubicBezier(p1, p2, duration, x) {
			// The epsilon value to pass given that the animation is going
			// to run over duruation seconds. The longer the animation, the
			// more precision is needed in the timing function result to
			// avoid ugly discontinuities.
			var epsilon = 1 / (200 * duration);

			// Calculate the polynomial coefficients. Implicit first and last
			// control points are (0,0) and (1,1).
			var cx = 3 * p1[0];
			var bx = 3 * (p2[0] - p1[0]) - cx;
			var ax = 1 - cx - bx;
			var cy = 3 * p1[1];
			var by = 3 * (p2[1] - p1[1]) - cy;
			var ay = 1 - cy - by;

			var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
			return sampleCubicBezier(ay, by, cy, y);
		}),

		// Exponential functions
		//
		// e - exponent
		// x - range 0-1
		//
		// eg.
		// var easeInQuad   = exponential(2);
		// var easeOutCubic = exponentialOut(3);
		// var easeOutQuart = exponentialOut(4);

		exponentialOut: curry(function exponentialOut(e, x) {
			return 1 - Math.pow(1 - x, e);
		}),


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


		// Time

		now: now,


		// JSON

		stringify: function stringify(object) {
			return JSON.stringify(Fn.toClass(object) === "Map" ?
				Fn(object) :
				object
			);
		}
	});
})(this);
