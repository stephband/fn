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

	function compose(fn1, fn2) {
		return function composed(n) { fn1(fn2(n)); }
	}

	function pipe() {
		var fns = A.slice.apply(arguments);
		return function pipe(n) { return fns.reduce(call, n); }
	}

	function curry(fn, parity) {
		var par = parity || fn.length;

		// Define length so that curried functions accurately show how many
		// arguments they are yet expecting.
		return Object.defineProperty(function curried() {
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
		}, 'length', { value: par });
	}

	// Curries

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
	var uppercase = curry(function uppercase(string) { return S.toUpperCase.apply(string); });
	var lowercase = curry(function lowercase(string) { return S.toLowerCase.apply(string); });

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
		// Fast out if references are for the same object
		if (a === b) { return true; }

		var keys = Object.keys(a);
		var n = keys.length;

		while (n--) {
			if (a[keys[n]] !== b[keys[n]]) {
				return false;
			}
		}

		return true;
	});

	// Generators

	function Generator(next, push) {
		// Enable calling Generator without the new keyword.
		if (this === window || this === null) {
			return new Generator(next, push);
		}

		this.next = next;
		if (push) { this.push = push; }
	}

	function ArrayGenerator(source) {
		if (source) { A.slice(source); }

		var array = source || [] ;

		return new Generator(function next() {
			var value;
			// Ignore holes in arrays
			while (array.length && (value = array.shift()) === undefined);
			return value;
		}, function push() {
			A.push.apply(array, arguments);
		});
	}

	function MapGenerator(source, transform) {
		return new Generator(function next() {
			var value = source.next();
			return value !== undefined ? transform(value) : undefined ;
		}, source.push);
	}

	Object.assign(Generator.prototype, {
		head: function() {
			var source = this;
			var i = 0;

			return new Generator(function next() {
				return i++ === 0 ? source.next() : undefined ;
			}, source.push);
		},

		tail: function() {
			var source = this;
			var i = 0;

			return new Generator(function tail() {
				if (i++ === 0) { source.next(); }
				return source.next();
			}, source.push);
		},

		slice: function(n, m) {
			var source = this;
			var i = 0;

			return new Generator(function next() {
				while (i < n) {
					source.next();
					++i;
				}

				return i++ < m ? source.next() : undefined ;
			}, source.push);
		},

		map: function(fn) {
			return MapGenerator(this, fn);
		},

		find: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn.apply ? fn :
				equal(fn) ;

			function process() {
				var value;

				while ((value = source.next()) !== undefined && !fn(value));

				if (value !== undefined) {
					// Process is a call once kind of thing
					process = noop;
				}

				return value;
			}

			return Generator(function next() {
				return process();
			}, source.push);
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return Generator(function next() {
				var value;
				while ((value = source.next()) !== undefined && !fn(value));
				return value;
			}, source.push);
		},

		reduce: function(fn) {
			var i = 0, t = 0;
			return MapGenerator(this, function reduce(value) {
				return fn(value, t, i++);
			});
		},

		sort: function(fn) {
			var source = this;
			var array = [];

			fn = fn || byGreater ;

			return Generator(function next() {
				if (array.length === 0) {
					array = source.toArray();
					array.sort(fn);
				}

				return array.shift();
			}, source.push);
		},

		unique: function() {
			var source = this;
			var buffer = [];

			return new Generator(function unique() {
				var value = source.next();

				if (value === undefined) { return; }

				if (buffer.indexOf(value) === -1) {
					buffer.push(value);
					return value;
				}

				// If we have not already returned carry on looking
				// for a unique value.
				return unique();
			}, source.push);
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return new Generator(n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
					var value;

					while (buffer.length < n) {
						value = source.next();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						var _buffer = buffer;
						buffer = [];
						return _buffer;
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				},

			source.push);
		},

		flatten: function(n) {
			var source = this;
			var buffer = [];

			return new Generator(function next() {
				// Support flattening of generators and arrays
				var value = buffer.next ? buffer.next() : buffer.shift() ;
				var b;

				if (value === undefined) {
					b = source.next();
					if (b === undefined) { return; }
					buffer = b;
					value = buffer.next ? buffer.next() : buffer.shift() ;
				}

				return value ;
			}, source.push);
		},

		each: function(fn) {
			var source = this;
			var _next = this.next;

			this.next = function next() {
				var value = _next.apply(source);
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
		stringify:   function() { return this.map(String); },
		jsonify:     function() { return this.map(JSON.stringify); },
		parsejson:   function() { return this.map(JSON.parse); },
		slugify:     function() { return this.map(slugify); },
		matches:     function(regexp) { return this.map(match(regexp)); },
		regex:       function(regexp) { return this.map(regex(regexp)); },
		uppercase:   function() { return this.map(uppercase); },
		lowercase:   function() { return this.map(lowercase); },

		get:         function(name) { return this.map(get(name)); },
		set:         function(name, value) { return this.map(set(name, value)); },
		assign:      function(object) { return this.map(assign(object)); },

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},

		group: function(fn) {
			var source = this;

			if (typeof fn === 'string' || typeof fn === 'number') {
				fn = Fn.get(fn);
			}

			return Generator(function next() {
				var keys = Object.create(null);
				var object, key;

				// Consume source
				while(object = source.next()) {
					key = fn(object);
					if (keys[key]) {
						keys[key].push(object);
					}
					else {
						keys[key] = ArrayGenerator([object]);
					}
				}

				return keys;
			}, source.push);
		},

		type: function() {
			return this.map(function(value) {
				return typeof value;
			});
		},

		done: function(fn) {
			var source = this;
			var next = this.next;

			this.next = function next() {
				var value = _next.apply(source);
				if (value === undefined) { fn(); }
				return value;
			};

			return this;
		},

		push: function(input) {
			throw new Error('Fn: generator is not pushable. ' + input);
		},

		toFunction: function() {
			var source = this;
			return function fn(input) {
				if (input !== undefined) { source.push(input); }
				return source.next();
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

	Generator.prototype.fn = Generator.prototype.toFunction;
	Generator.prototype.toJSON = Generator.prototype.toArray;

	// Fn

	function Fn(source, fn) {
		return source.apply ?
			// Source is a .next() function, fn is a .push() fn.
			Generator(source, fn) :
		source.next ?
			// Source is generator, fn is a transform.
			MapGenerator(source, fn) :
			// Source is an array.
			ArrayGenerator(source) ;
	}

	Object.assign(Fn, {
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
		not:      not,

		// Generators
		Generator:      Generator,
		ArrayGenerator: ArrayGenerator,
		MapGenerator:   MapGenerator
	});

	window.Fn = Fn;
})(this);
