(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Fn');
	console.log('https://github.com/cruncher/fn');
	console.log('______________________________');
})(this);

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


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function call(fn, value) {
		return fn(value);
	}

	function compose(fn1, fn2) {
		return function composed(n) { return fn1(fn2(n)); }
	}

	function pipe() {
		var a = arguments;
		return function pipe(n) { return A.reduce.call(a, call, n); }
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function with parity of the remaining
				// number of required arguments. And curry that.
				curry(function partial() {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		}

		// Make the string representation of this function equivalent to fn
		// for sane debugging
		if (debug) {
			curried.toString = function() { return fn.toString(); };
		}

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		return isFunctionLengthDefineable ?
			Object.defineProperty(curried, 'length', { value: parity }) :
			curried ;
	}


	// Get and set paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?\.|\[/g;

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(object, array) {
		var key   = array.shift();
		var value = object[key];

		return array.length === 0 ? value :
			value !== undefined ? objFrom(value, array) :
			undefined ;
	}

	function objTo(root, array, object) {
		var key = array.shift();

		return array.length === 0 ?
			(root[key] = object) :
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array, object) ;
	}


	// Fn

	function Fn(object) {
		    // Object is a function
		return typeof object === "function" ? new Stream(object) :
			// Object is an iterator
			object && object.next ? new ReadStream(object) :
			// Object could be anything
			new BufferStream(object) ;
	}

	Object.assign(Fn, {
		noop:     noop,
		id:       id,
		call:     call,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

		is: curry(function is(object1, object2) {
			return object1 === object2;
		}),

		equals: curry(function equals(a, b) {
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
		}),

		by: curry(function by(property, a, b) {
			return Fn.byGreater(a[property], b[property]);
		}),

		byGreater: curry(function byGreater(a, b) {
			return a === b ? 0 : a > b ? 1 : -1 ;
		}),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),

		assign: curry(function assign(obj2, obj1) {
			return Object.assign(obj1, obj2);
		}),

		get: curry(function get(path, object) {
			return typeof path === 'number' ? object[path] :
				path === '' ? object :
				objFrom(object, splitPath(path));
		}),

		set: curry(function set(path, value, object) {
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		invoke: curry(function invoke(name, object) {
			return object[name]();
		}),

		concat:      curry(function concat(array2, array1) { return A.concat.call(array1, array2); }),
		each:        curry(function each(fn, object) { return A.forEach.call(object, fn); }),
		filter:      curry(function filter(fn, object) { return A.filter.call(object, fn); }),
		map:         curry(function map(fn, object) { return A.map.call(object, fn); }),
		reduce:      curry(function reduce(fn, n, object) { return A.reduce.call(object, fn, n); }),
		slice:       curry(function slice(n, m, object) { return A.slice.call(object, n, m); }),
		sort:        curry(function sort(fn, object) { return A.sort.call(object, fn); }),

		push: curry(function push(stream, object) {
			(stream.push || A.push).apply(stream, object);
			return stream;
		}),

		add:         curry(function add(a, b) { return b + a; }),
		multiply:    curry(function multiply(a, b) { return b * a; }),
		mod:         curry(function mod(a, b) { return b % a; }),
		pow:         curry(function pow(a, b) { return Math.pow(b, a); }),
		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),
		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),
		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog: curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(value / min) / Math.log(max / min))
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
		match: curry(function match(regex, string) { return regex.test(string); }),
		exec: curry(function parse(regex, string) { return regex.exec(string) || undefined; }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},

		// Booleans
		not: function not(object) { return !object; },

		// Types

		isDefined: function isDefined(value) {
			// !!value is a fast out for non-zero numbers, non-empty strings
			// and other objects, the rest checks for 0, '', etc.
			return !!value || (value !== undefined && value !== null);
		},

		typeOf: function typeOf(object) {
			return typeof object;
		},

		classOf: function classOf(object) {
			return O.toString.apply(object).slice(8, -1);
		},

		typeOfString: function typeOfString(string) {
			// Determine the type of string from its text content. Not to be used
			// as a definitive typing, but useful nonetheless.
			return /^(?:\/|https?\:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/.test(string) ? 'url' :
				/^(?:null|true|false)|^\{|^\[/.test(string) ? 'json' :
				'string' ;
		}
	});


	// Stream

	function arrayNext(array) {
		var value;

		// Shift values out ignoring undefined
		while (array.length && value === undefined) {
			value = array.shift();
		}

		return value;
	}

	var notifyObservers = curry(function(observers, type) {
		if (!observers[type]) { return; }
		//(new ReadStream(observers[type])).pull(Fn.run);
		var array = A.slice.apply(observers[type]);
		array.forEach(Fn.run);
	});

	function notifyObserversExceptPush(observers, type) {
		if (type === 'push') { return; }
		return notifyObservers(observers, type);
	}

	function Stream(setup) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var observers = {};
		var notify = notifyObservers(observers);

		function trigger(type) {
			// Prevent 'push' event calls from within 'next' event calls. This
			// is a bit of a clunky workaround to stop greedy processes
			// consuming the stream while the next values are being requested.
			var _notify = notify;
			notify = notifyObserversExceptPush;
			_notify(observers, type);
			notify = _notify;
		}

		Object.assign(this, setup(trigger));

		this.on = function on(type, fn) {
			// Lazily create observers list
			observers[type] = observers[type] || [] ;

			// Add observer
			observers[type].push(fn);

			return this;
		};
	}

	function BufferStream(object) {
		if (!this || !BufferStream.prototype.isPrototypeOf(this)) {
			return new BufferStream(object);
		}

		// Todo: Is this needed?
		this.status = 'ready';

		Stream.call(this, function setup(notify) {
			var buffer = typeof object === 'string' ? A.slice.apply(object) : object || [] ;

			return {
				next: function next() {
					var value = buffer.shift();

					if (buffer.status === 'done') {
						this.status = 'done';
					}

					return value;
				},

				push: function push() {
					buffer.push.apply(buffer, arguments);
					notify('push');
				}
			};
		});
	}

	function ReadStream(object) {
		if (!this || !ReadStream.prototype.isPrototypeOf(this)) {
			return new ReadStream(object);
		}

		Stream.call(this, function setup(notify) {
			var buffer = typeof object === 'string' ? A.slice.apply(object) : object || [] ;

			return {
				next: function() {
					var value = buffer.shift();

					if (buffer.status === 'done' || buffer.length === 0) {
						this.status = 'done';
					}

					return value;
				}
			};
		});
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

		shift: function() {
			return this.next();
		},

		pull: function pull1(fn) {
			fn = fn || Fn.noop;

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
			return this.on('push', flush);
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
				if (i++ === 0) {
					this.status = 'done';
					return source.next();
				}
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
			var i = -1;

			return this.create(function next() {
				while (++i < n) {
					source.next();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.next();
				}
			});
		},

		split: function(match) {
			var source = this;
			var buffer = [];

			return this.create(function next() {
				var value = source.next();
				var b;

				if (value === undefined) { return; }

				if (value === match) {
					b = buffer;
					buffer = [];
					return b;
				}

				buffer.push(value);

				if (source.status === 'done') {
					b = buffer;
					buffer = [];
					return b;
				}

				return next();
			});
		},

		group: function(fn, order) {
			var source = this;
			var channels = [];
			var store = {};

			fn = fn || Fn.id;

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
				Fn.is(fn) ;

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

			fn = typeof fn === 'object' ? Fn.compare(fn) : fn ;

			return this.create(function next() {
				var value;
				while ((value = source.next()) !== undefined && !fn(value));
				return value;
			}, source.push);
		},

		scan: function(fn) {
			var i = 0, t = 0;
			return this.map(function scan(value) {
				return fn(value, t, i++);
			});
		},

		sort: function(fn) {
			var source = this;
			var array = [];

			fn = fn || Fn.byGreater ;

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

		chain: function(n) {
			var source = this;
			var buffer = [];
			var stream = this.create(function next() {
				var value = buffer.shift() ;

				if (value !== undefined) {
					return value;
				}

				if (source.status === 'done') {
					this.status = 'done';
					return;
				}

				var b = source.next();

				if (b === undefined) {
					return;
				}

				buffer = ReadStream(b);
				return next();
			});

			stream.status = 'active';
			return stream;
		},

		add:         function(n) { return this.map(Fn.add(n)); },
		subtract:    function(n) { return this.map(Fn.subtract(n)); },
		multiply:    function(n) { return this.map(Fn.multiply(n)); },
		divide:      function(n) { return this.map(Fn.divide(n)); },
		mod:         function(n) { return this.map(Fn.mod(n)); },
		pow:         function(n) { return this.map(Fn.pow(n)); },
		normalise:   function(min, max) { return this.map(Fn.normalise(min, max)); },
		denormalise: function(min, max) { return this.map(Fn.denormalise(min, max)); },

		boolify:     function() { return this.map(Boolean); },
		stringify:   function() { return this.map(String); },
		jsonify:     function() { return this.map(JSON.stringify); },
		slugify:     function() { return this.map(Fn.slugify); },
		match:       function(regex) { return this.map(Fn.match(regex)); },
		exec:        function(regex) { return this.map(Fn.exec(regex)); },

		get:         function(name) { return this.map(Fn.get(path)); },
		set:         function(name, value) { return this.map(Fn.set(path, value)); },
		assign:      function(object) { return this.map(Fn.assign(object)); },

		typeOf: function() { return this.map(Fn.typeOf); },
		classOf: function() { return this.map(Fn.classOf); },

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
			return new ReadStream(this);
		},

		toString: function() {
			return this.toArray().join('');
		},

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

	Object.assign(Fn, {
		Stream:       Stream,
		ReadStream:   ReadStream,
		BufferStream: BufferStream
	});


	// Export

	window.Fn = Fn;

})(this);
