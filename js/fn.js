(function(window) {
	"use strict";

	var debug = true;

	// Import

	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
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


	// Utility functions

	function noop() {}

	function isDefined(value) { return value !== undefined; }

	function byGreater(a, b) { return a > b ? 1 : -1 ; }

	function byLocalAlphabet(a, b) { return S.localeCompare.call(a, b); }

	function slugify(value) {
		if (typeof value !== 'string') { return; }
		return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
	}


	// Get and set

	var rpathtrimmer = /^\[|]$/g;
	var rpathsplitter = /\]?\.|\[/g;

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];

		return array.length === 0 ? val :
			val !== undefined ? objFrom(val, array) :
			val ;
	}

	function objTo(root, array, obj) {
		var key = array[0];

		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function getPath(path, obj) {
		return path === '' ? obj :
			typeof path === 'number' ? obj[path] :
			objFrom(obj, splitPath(path));
	}

	function setPath(path, value, obj) {
		if (typeof path === 'number') { return obj[path] = value; }
		var array = splitPath(path);
		return array.length === 1 ?
			(obj[path] = value) :
			objTo(obj, array, value);
	}


	// Functional functions

	function identity(n) { return n; }

	function compose(fn1, fn2) {
		return function composed(n) { return fn1(fn2(n)); }
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


	// Curried functions

	var get = curry(getPath);
	var set = curry(setPath);

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


	// Stream

	function run(fn) { fn(); }

	function notifyObservers(observers, type) {
		if (!observers[type]) { return; }
		//(new ReadStream(observers[type])).pull(run);
		var array = A.slice.apply(observers[type]);
		array.forEach(run);
	}

	function notifyObserversExceptPush(observers, type) {
		if (type === 'push') { return; }
		return notifyObservers(observers, type);
	}

	function BufferStream(values) {
		if (!this || !BufferStream.prototype.isPrototypeOf(this)) {
			return new BufferStream(values);
		}

		var buffer = values ? A.slice.apply(values) : [] ;

		Stream.call(this, function next() {
			return buffer.shift();
		}, function push() {
			buffer.push.apply(buffer, arguments);
		});
	}

	function ReadStream(object) {
		if (!this || !ReadStream.prototype.isPrototypeOf(this)) {
			return new ReadStream(object);
		}

		object = object || [];

		Stream.call(this, object.next ? function next() {
			// Object is an iterator
			var answer = object.next();
			//if (answer.done) { notify('end') }
			return answer.value;
		} : function next() {
			// Object is and array-like object
			var value = object.shift();
			//if (object.length === 0) { notify('end') }
			return value;
		});
	}

	function MixinPushable(next, push, trigger) {
		this.next = Fn.compose(function(value) {
			if (value === undefined) {
				trigger('next');
				return next();
			}

			return value;
		}, next);

		this.push = function() {
			var values = A.filter.call(arguments, isDefined);
			push.apply(null, values);
			trigger('push');
		};
	}

	function MixinReadOnly(next, trigger) {
		this.next = next;
	}

	function Stream(next, push) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(next, push);
		}

		var notify = notifyObservers;
		var observers = {};

		function trigger(type) {
			// Prevent 'push' event calls from within 'next' event calls. This
			// is a bit of a clunky workaround to stop greedy processes
			// consuming the stream while the next values are being requested.
			var _notify = notify;
			notify = notifyObserversExceptPush;
			_notify(observers, type);
			notify = _notify;
		}

		if (push) {
			MixinPushable.call(this, next, push, trigger);
		}
		else {
			MixinReadOnly.call(this, next, trigger);
		}

		this.on = function on(type, fn) {
			// Lazily create observers list
			observers[type] = observers[type] || [] ;

			// Add observer
			observers[type].push(fn);

			return this;
		};


	}

	Object.assign(Stream.prototype, {
		create: function(next) {
			var stream = Object.create(this);
			stream.next = next;
			return stream;
		},

		push: function(input) {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		pull: function pull1(fn) {
			var next = this.next;

			function flush() {
				var value;

				while ((value = next()) !== undefined) {
					fn(value);
				}
			}

			this.pull = function pull2(fn2) {
				var fn1 = fn;

				fn = function distribute() {
					fn1.apply(null, arguments);
					fn2.apply(null, arguments);
				};

				// Return source
				return this;
			};

			// Flush the source then listen for values
			flush();
			this.on('push', function() {
				flush();
			});
			return this;
		},

		pipe: function(object) {
			// object is either:
			// array -
			// stream -
			// undefined -

			var source = this;
			var stream = object || new BufferStream();

			this.tap(function(value) {
				stream.push(value);
			});

			if (stream.on) {
				// There's something stinky yet elegant about these two.
				stream
				.on('next', function() {
					// Call .next(), which fills all streams with the new value.
					var v = source.next();
				});

				source
				.on('push', function() {
					// Notify a push event without actually pushing any values,
					// because .next() will do that if it's asked for.
					stream.push();
				});
			}

			return stream;
		},

		tap: function(fn) {
			// Overwrite next to copy values to tap fn
			this.next = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.next);

			return this;
		},

		map: function(fn) {
			return this.create(Fn.compose(function next(value) {
				return value !== undefined ? fn(value) : undefined ;
			}, this.next));
		},

		head: function() {
			var source = this;
			var i = 0;

			return this.create(function next() {
				return i++ === 0 ? source.next() : undefined ;
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return this.create(function next() {
				if (i++ === 0) { source.next(); }
				return source.next();
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = 0;

			return this.create(function next() {
				while (i < n) {
					source.next();
					++i;
				}

				return i++ < m ? source.next() : undefined ;
			});
		},

		group: function(fn, order) {
			var source = this;
			var channels = [];
			var store = {};

			fn = fn || Fn.identity;

			function nextUntilMatchChannel(channelKey) {
				var value = source.next();
				if (value === undefined) { return; }

				var key = fn(value);

				if (store[key]) {
					store[key].push(value);
					if (store[key] === channelKey) { return; }
				}
				else {
					store[key] = create(key);
					channels.push(store[key]);
					store[key].push(value);
				}

				return nextUntilMatchChannel(channelKey);
			}

			function create(key) {
				var channel = new BufferStream();

				channel.on('next', function() {
					nextUntilMatchChannel(key);
				});

				// source.on('push', channel.push);
				if (debug) { channel.key = key; }
				return channel;
			}

			return this.create(function nextUntilNewChannel() {
				var channel = channels.shift();
				if (channel) { return channel; }

				var value = source.next();
				if (value === undefined) { return; }

				var key = fn(value);

				if (store[key]) {
					store[key].push(value);
				}
				else {
					store[key] = create(key);
					store[key].push(value);
					return store[key];
				}

				return nextUntilNewChannel();
			});
		},

		concatParallel: function() {
			var source = this;
			var object;
			var order = [];

			function bind(object) {
				object.on('push', function() {
					order.push(object);
				});
				order.push(object);
			}

			function shiftNext() {
				var stream = order.shift();
				if (stream === undefined) { return; }
				var value = stream.next();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return this.create(function next() {
				var object = source.next();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		concatSerial: function() {
			var source = this;
			var object;

			return this.create(function next() {
				object = object || source.next();
				if (object === undefined) { return; }

				var value = object.next ? object.next() : object.shift() ;

				if (value === undefined) {
					object = undefined;
					return next();
				}

				return value;
			});
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

			return new this.constructor(function next() {
				return process();
			}, source.push);
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return new this.constructor(function next() {
				var value;
				while ((value = source.next()) !== undefined && !fn(value));
				return value;
			}, source.push);
		},

		reduce: function(fn) {
			var i = 0, t = 0;
			return this.map(function reduce(value) {
				return fn(value, t, i++);
			});
		},

		sort: function(fn) {
			var source = this;
			var array = [];

			fn = fn || byGreater ;

			return new this.constructor(function next() {
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

			return new this.constructor(function unique() {
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

			return new this.create(n ?
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
				});
		},

		concatAll: function() {
			var source = this;
			var object;

			return this.create(function next() {
				var value = object.next ? object.next() : object.shift() ;
				if (value !== undefined) { return value; }
				object = source.next();
				if (object === undefined) { return; }
				return next();
			});
		},

		concatMap: function(fn) {
			return this.map(fn).concatAll();
		},

		flatten: function(n) {
			var source = this;
			var buffer = [];

			return this.create(function next() {
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
			});
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
		json:        function() { return this.map(JSON.parse); },
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

		typeOf: function() {
			return this.map(function(value) {
				return typeof value;
			});
		},

		classOf: function() {
			return this.map(classOf);
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

		apply: function(ignored, values) {
			this.push.apply(this, values);
			return this.next();
		},

		call: function() {
			var values = A.slice.call(arguments, 1);
			return this.apply(this, values);
		},

		toArray: function() {
			var result = [];
			var value;

			while ((value = this.next()) !== undefined) {
				result.push(value);
			}

			return result;
		},

		toReadStream: function() {
			var source = this;
			return new Stream(function next() {
				return source.next();
			});
		},

		//toString: function() {
		//	return this.toArray().join('');
		//},

		toFunction: function() {
			var source = this;
			return function fn() {
				return source.apply(source, arguments);
			};
		},

		toPromise: function() {
			var source = this;
			var value = this.next();

			return new Promise(function setup(next, reject) {
				if (value !== undefined) {
					next(value);
					return;
				}

				source
				.on('push', function() {
					var value = source.next();
					if (value !== undefined) { next(value); }
				})
				.on('end', reject);
			});
		}
	});

	Stream.prototype.toJSON = Stream.prototype.toArray;
	Object.setPrototypeOf(ReadStream.prototype, Stream.prototype);
	Object.setPrototypeOf(BufferStream.prototype, Stream.prototype);

	// Fn

	function Fn(object, push) {
		return push ?
				// Object must be a next() function
				new Stream(object, push) :
			object && object.next ?
				// Object is an iterator.
				new ReadStream(object) :
			// Object is not defined
			new BufferStream(object) ;
	}

	Object.assign(Fn, {
		// Generators
		Stream:       Stream,
		ReadStream:   ReadStream,
		BufferStream: BufferStream,

		noop:     noop,
		identity: identity,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

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

	window.Fn = Fn;
	window.Stream = Stream;
})(this);
