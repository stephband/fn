(function(window) {

	// Native

	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var S = String.prototype;

	// Polyfill

	if (!Math.log10) {
		Math.log10 = function log10(n) {
			return Math.log(n) / Math.LN10;
		};
	}

	//if (window.Promise) {
	//	// Enable use of .map() on promises.
	//	Promise.prototype.map = Promise.prototype.then;
	//}

	// Functions

	function noop() {}
	function identity(n) { return n; }
	function byGreater(a, b) { return a > b ? 1 : -1 ; }
	function byLocalAlphabet(a, b) { return S.localeCompare.call(a, b); }

	function slugify(value) {
		if (typeof value !== 'string') { return; }
		return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
	}

	// Functional

	var concat   = curry(function concat(array2, array1) { return A.concat.call(array1, array2); });
	var each     = curry(function each(fn, array) { return A.forEach.call(array, fn); });
	var filter   = curry(function filter(fn, array) { return A.filter.call(array, fn); });
	var indexOf  = curry(function indexOf(n, array) { return A.indexOf.call(array, n); });
	var map      = curry(function map(fn, array) { return A.map.call(array, fn); });
	var reduce   = curry(function reduce(fn, n, array) { return A.reduce.call(array, fn, n); });
	var slice    = curry(function slice(n, m, array) { return A.slice.call(array, n, m); });
	var sort     = curry(function sort(fn, array) { return A.sort.call(array, fn); });

	var add      = curry(function add(a, b) { return b + a; });
	var subtract = curry(function subtract(a, b) { return b - a; });
	var multiply = curry(function multiply(a, b) { return b * a; });
	var divide   = curry(function divide(a, b) { return b / a; });
	var mod      = curry(function mod(a, b) { return b % a; });
	var pow      = curry(function pow(a, b) { return Math.pow(b, a); });
	var normalise = curry(function normalise(min, max, value) { return (value - min) / (max - min); });
	var denormalise = curry(function denormalise(min, max, value) { return value * (max - min) + min; });
	var toFixed  = curry(function toFixed(n, value) { return N.toFixed.call(value, n); });

	var not      = curry(function not(value) { return !value; });
	var equal    = curry(function equal(a, b) { return a === b; });

	var match    = curry(function match(r, string) { return r.test(string); });
	var regexp   = curry(function parse(r, string) { return r.exec(string) || undefined; });

	var get      = curry(function get(name, object) { return object[name]; });
	var set      = curry(function get(name, value, object) { return object[name] = value; });
	var assign   = curry(function assign(obj2, obj1) { return Object.assign(obj1, obj2); });
	var keys     = curry(function keys(obj) { return Object.keys(obj); });
	var call     = curry(function call(value, fn) { return fn.call(null, value); });
	var apply    = curry(function apply(array, fn) { return fn.apply(null, array); });

	var rangeLog = curry(function rangeLog(min, max, n) {
		return denormalise(min, max, Math.log(value / min) / Math.log(max / min))
	});

	var rangeLogInv = curry(function rangeLogInv(min, max, n) {
		return min * Math.pow(max / min, normalise(min, max, n));
	});

	var compare  = curry(function compare(a, b) {
		var keys = Object.keys(a);
		var n = keys.length;

		while (n--) {
			if (a[keys[n]] !== b[keys[n]]) {
				return false;
			}
		}

		return true;
	});

	function compose(fn1, fn2) {
		return function composed(n) { fn1(fn2(n)); }
	}

	function pipe() {
		var fns = A.slice.apply(arguments);
		return function pipe(n) { return fns.reduce(call, n); }
	}

	function curry(fn, parity) {
		var par = parity || fn.length;
		return function curried() {
			var args = arguments;
			return args.length >= par ?
				// If there are enough arguments, call fn.
				fn.apply(this, args) :
				// Otherwise create a new function with length equal to the
				// remaining number of required arguments. And curry that.
				// All functions are curried functions.
				curry(function() {
					var params = A.slice.apply(args);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, par - args.length) ;
		}
	}

	function Generator(source, fn) {
		// Enable calling Generator without the new keyword.
		if (this === window || this === null) {
			return new Generator(source, fn);
		}

		// Generator takes a source and a transform function.
		// Source can be an array, generator or function.
		source = source || identity;
		fn = fn || identity;

		// Define the next() method based on type of source.
		this.next =
			// Source is a Generator.
			source.next ? function next(input) {
				// Can be called with a input value, pushing it into the pipe.
				var value = source.next(input);
				return value === undefined ? undefined : fn(value) ;
			} :

			// Source is a function.
			source.apply ? function next(input) {
				// Can be called with a input value, pushing it into the pipe.
				var value = source(input);
				return value === undefined ? undefined : fn(value) ;
			} :

			// Source is an array. Copy it.
			(source = A.slice.apply(source),
			function next(input) {
				var n = -1;
				var value;

				// If an input value ahs been passed in, add it to the stack.
				// This is a bit of a fudge for adding and removing from the
				// stack at the same time. Review.
				if (input !== undefined) { source.push(input); }

				// Ignore holes in arrays
				while (source.length && (value = source.shift()) === undefined);
				return value !== undefined ? fn(value) : undefined ;
			}) ;

		// Define the .push() method.
		this.push =
			source.push ? function push(input) {
				source.push(input);
			} :
			source ;
	}

	Object.assign(Generator.prototype, {
		head: function() {
			var source = this;
			var i = 0;

			return new Generator(function head(input) {
				return i++ === 0 ? source.next(input) : undefined ;
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return new Generator(function tail(input) {
				if (i++ === 0) {
					source.next();
					input = undefined;
				}

				return source.next(input);
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = 0;

			return new Generator(function next(input) {
				while (i < n) {
					source.next(input);
					++i;
				}

				return i++ < m ? source.next() : undefined ;
			});
		},

		map: function(fn) {
			return Generator(this, fn);
		},

		find: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn.apply ? fn :
				equal(fn) ;

			function process(input) {
				var value = source.next(input);

				while (value !== undefined && !fn(value)) {
					value = source.next();
				}

				if (value !== undefined) {
					// Process is a call once kind of thing
					process = process2;
				}

				return value;
			}

			function process2(input) {
				if (input === undefined) { return; }
				source.next(input);
			}

			return Generator(function(input) {
				return process(input);
			});
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return Generator(function(input) {
				var value;
				while ((value = source.next(input)) !== undefined && !fn(value));
				return value;
			});
		},

		reduce: function(fn) {
			var i = 0, t = 0;
			return Generator(this, function reduce(value) {
				t = fn(value, t, i++);
				return t;
			});
		},

		sort: function(fn) {
			var source = this;
			var array = [];

			fn = fn || byGreater ;

			return Generator(function next(input) {
				if (array.length === 0) {
					array = source.toArray();
					array.sort(fn);
				}

				// Sort cant sort asynchrounous input: its added to
				// the end of the stack.
				if (input !== undefined) {
					var value = source.next(input);
					if (value !== undefined) { array.push(value); }
				}

				return array.shift();
			});
		},

		unique: function() {
			var source = this;
			var buffer = [];

			return new Generator(function unique(input) {
				var value = source.next(input);

				if (value === undefined) { return; }

				if (buffer.indexOf(value) === -1) {
					buffer.push(value);
					return value;
				}

				return unique(input);
			});
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return new Generator(n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN(input) {
					var value;

					while (buffer.length < n) {
						value = source.next(input);
						if (value === undefined) { return; }
						input = undefined;
						buffer.push(value);
					}

					if (buffer.length >= n) {
						var _buffer = buffer;
						buffer = [];
						return _buffer;
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch(input) {
					buffer = source.toArray();

					if (input !== undefined) {
						var value = source.next(input);
						if (value !== undefined) { buffer.push(value); }
					}

					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				}
			);
		},

		flatten: function(n) {
			var source = this;
			var buffer = [];

			return new Generator(function next(input) {
					// Support flattening of generators and arrays
					var value = buffer.next ? buffer.next() : buffer.shift() ;
					var b;

					// Buggy - separate .push() from .next()
					if (input !== undefined) {
						source.push(input);
					}

					if (value === undefined) {
						b = source.next();
						if (b === undefined) { return; }
						buffer = b;
						value = buffer.next ? buffer.next() : buffer.shift() ;
					}

					return value ;
				}
			);
		},

		each: function(fn) {
			var next = this.next;

			this.next = function() {
				var value = next.apply(this, arguments);
				if (value !== undefined) { fn(value) };
				return value;
			};

			return this;
		},

		add:         function(n) { return this.map(add(n)); },
		subtract:    function(n) { return this.map(subtract(n)); },
		multiply:    function(n) { return this.map(multiply(n)); },
		divide:      function(n) { return this.map(divide(n)); },
		mod:         function(n) { return this.map(mod(n)); },
		pow:         function(n) { return this.map(pow(n)); },
		log10:       function(n) { return this.map(Math.log10); },
		normalise:   function(min, max) { return this.map(normalise(min, max)); },
		denormalise: function(min, max) { return this.map(denormalise(min, max)); },
		rangeLog:    function(min, max) { return this.map(rangeLog(min, max)); },
		rangeLogInv: function(min, max) { return this.map(rangeLogInv(min, max)); },
		decimals:    function(n) { return this.map(toFixed(n)); },
		int:         function() { return this.map(parseInt); },
		float:       function() { return this.map(parseFloat); },
		boolean:     function() { return this.map(Boolean); },
		string:      function() { return this.map(String); },
		json:        function() { return this.map(JSON.stringify); },
		parsejson:   function() { return this.map(JSON.parse); },
		slugify:     function() { return this.map(slugify); },
		match:       function(regexp) { return this.map(match(regexp)); },
		regex:       function(regexp) { return this.map(regex(regexp)); },
		uppercase:   function(value) { return this.map(S.toUpperCase.apply); },
		lowercase:   function(value) { return this.map(S.toLowerCase.apply); },

		get:         function(name) { return this.map(get(name)); },
		set:         function(name, value) { return this.map(set(name, value)); },
		assign:      function(object) { return this.map(assign(object)); },

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},

		type: function() {
			return this.map(function(value) {
				return typeof value;
			});
		},

		done: function(fn) {
			var next = this.next;

			this.next = function() {
				var value = next.apply(this, arguments);
				if (value === undefined) { fn(); }
				return value;
			};

			return this;
		},

		fn: function() {
			// Alias to toFunction
			return this.toFunction();
		},

		toFunction: function() {
			var source = this;

			return function fn() {
				return source.next.apply(source, arguments);
			};
		},

		toArray: function() {
			var result = [];
			var value;

			while ((value = this.next()) !== undefined) {
				result.push(value);
			}

			return result;
		}
	});

	Object.assign(Generator, {
		identity: identity,
		curry:    curry,
		compose: compose,
		pipe:    pipe,

		// Arrays
		concat:   concat,
		each:     each,
		filter:   filter,
		indexOf:  indexOf,
		map:      map,
		reduce:   reduce,
		slice:    slice,
		sort:     sort,

		// Objects
		equal:    equal,
		compare:  compare,
		get:      get,
		set:      set,
		assign:   assign,
		keys:     keys,

		// Functions -
		// Careful, call and apply might cause trouble attached to the
		// constructor as a namespace.
		call:     call,
		apply:    apply,

		// Numbers
		add:      add,
		subtract: subtract,
		multiply: multiply,
		divide:   divide,
		pow:      pow,
		normalise: normalise,
		denormalise: denormalise,
		rangeLog: rangeLog,
		rangeLogInv: rangeLogInv,
		toFixed:  toFixed,

		// Strings
		match:    match,
		regexp:   regexp,
		slugify:  slugify,

		// Booleans
		not:      not
	});

	window.Fn = Generator;
	window.Events = Events;

	function Events(source, fn) {
		// Enable calling Events without the new keyword.
		if (this === window || this === null) {
			return new Events(source, fn);
		}

		F.call.call(Generator, this, source, fn);
	}

	Object.assign(Events.prototype, Generator.prototype, {
		map: function(fn) {
			return Events(this, fn);
		},

		transpose: function(n) {
			return Events(this, function transpose(event) {
				if (event[0] === 'note') {
					 event = event.slice();
					 event[1] += n;
				}

				return event;
			})
		},

		transposeDiatonic: function(key, n) {
			return Events(this, function transpose(event) {
				if (event[0] === 'note') {
					event = event.slice();
					// Diatonic transpose!!
					//event[1] += n;
				}

				return event;
			})
		}
	});
})(this);
