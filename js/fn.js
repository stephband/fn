(function(window) {

	// Native

	var A = Array.prototype;
	var F = Function.prototype;

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
	var pow      = curry(function pow(a, b) { return Math.pow(b, a); });
	var log      = curry(function pow(a, b) { return Math.log10(b, a); });
	var bool     = curry(function bool(value) { return !!value; });
	var not      = curry(function not(value) { return !value; });
	var equal    = curry(function equal(a, b) { return a === b; });
	var match    = curry(function match(r, string) { return r.test(string); });
	var parse    = curry(function parse(r, string) { return r.exec(string) || undefined; });
	var get      = curry(function get(name, object) { return object[name]; });
	var set      = curry(function get(name, value, object) { return object[name] = value; });
	var assign   = curry(function assign(obj2, obj1) { return Object.assign(obj1, obj2); });
	var keys     = curry(function keys(obj) { return Object.keys(obj); });
	var call     = curry(function call(value, fn) { return fn.call(null, value); });
	var apply    = curry(function apply(array, fn) { return fn.apply(null, array); });

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

	function noop() {}

	function identity(n) { return n; }

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

		var n = -1;

		this.next =
			// Source is a function
			source.apply ? function next(seed) {
				// Can be called with a seed value, pushing it into the pipe.
				var value = source(seed);
				return value === undefined ? undefined : fn(value) ;
			} :

			// Source is a Generator
			source.next ? function next(seed) {
				// Can be called with a seed value, pushing it into the pipe.
				var value = source.next(seed);
				return value === undefined ? undefined : fn(value) ;
			} :

			// Source is an array
			function next() {
				// Ignore holes in arrays
				while (++n < source.length && source[n] === undefined);
				return n < source.length ? fn(source[n]) : undefined ;
			} ;
	}

	Object.assign(Generator.prototype, {
		head: function() {
			var source = this;
			var i = 0;

			return new Generator(function head(seed) {
				return i++ === 0 ? source.next(seed) : undefined ;
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return new Generator(function tail(seed) {
				if (i++ === 0) {
					source.next();
					seed = undefined;
				}

				return source.next(seed);
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = 0;

			return new Generator(function next(seed) {
				while (i < n) {
					source.next(seed);
					++i;
				}

				return i++ < m ? source.next() : undefined ;
			});
		},

		batch: function(n) {
			var source = this;

			return new Generator(function next() {
				var buffer = [];
				var value;

				while (buffer.length < n) {
					value = source.next();
					if (value === undefined) { return buffer; }
					b.push(value);
				}

				return buffer;
			});
		},

		map: function(fn) {
			return Generator(this, fn);
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return Generator(function(seed) {
				var value;
				while ((value = source.next(seed)) !== undefined && !fn(value));
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

		unique: function() {
			var buffer = [];
			return new Generator(this, function unique(value) {
				if (buffer.indexOf(value) === -1) {
					buffer.push(value);
					return value;
				}
			});
		},

		add: function(n) { return this.map(add(n)); },
		subtract: function(n) { return this.map(subtract(n)); },
		multiply: function(n) { return this.map(multiply(n)); },
		divide: function(n) { return this.map(divide(n)); },
		pow: function(n) { return this.map(pow(n)); },
		match: function(regexp) { return this.map(match(regexp)); },
		parse: function(regexp) { return this.map(parse(regexp)); },
		get: function(name) { return this.map(get(name)); },
		set: function(name, value) { return this.map(set(name, value)); },
		assign: function(object) { return this.map(assign(object)); },

		tap: function(fn) {
			var next = this.next;

			this.next = function() {
				var value = next.apply(this, arguments);
				if (value !== undefined) { fn(value) };
				return value;
			};

			return this;
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

		toFunction: function() {
			var source = this;

			return function fn() {
				return source.next.apply(source, arguments);
			};
		},

		toArray: function() {
			var result = [];
			var value;

			while (value = this.next()) {
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
		// Careful, call and apply might cause trouble attached to the constructor
		call:     call,
		apply:    apply,

		// Numbers
		add:      add,
		subtract: subtract,
		multiply: multiply,
		divide:   divide,
		pow:      pow,
		log:      log,

		// Strings
		match:    match,
		parse:    parse,

		// Booleans
		bool:     bool,
		not:      not
	});

	window.Fn = Generator;
})(this);
