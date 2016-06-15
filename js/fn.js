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

	function call(fn) {
		return fn();
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


	// String types

	var regex = {
		url:       /^(?:\/|https?\:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/,
		//url:       /^([a-z][\w\.\-\+]*\:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}/,
		email:     /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(\-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(\-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^(\-?\d+(?:\.\d+)?)$/,
		int:       /^(\-?\d+)$/
	};


	// Throttle

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance.now ? function now() {
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
			fns.forEach(Fn.apply([now()]));
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
			createRequestTimerFrame(time) :
			requestAnimationFrame ;

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

		function queue() {
			// Don't queue update if it's already queued
			if (queued) { return; }
			queued = true;

			// Queue update
			request(update);
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
		Throttle: Throttle,

		noop:     noop,
		id:       id,
		call:     call,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

		of: function of() {
			return Fn(arguments);
		},

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

		apply: curry(function apply(values, fn) {
			return fn.apply(null, values);
		}),

		map: curry(function map(fn, object) {
			return object.map(fn);
		}),

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

		concat:      curry(function concat(array2, array1) { return array1.concat ? array1.concat(array2) : A.concat.call(array1, array2); }),
		each:        curry(function each(fn, object) { return object.each ? object.each(fn) : A.forEach.call(object, fn); }),
		filter:      curry(function filter(fn, object) { return object.filter ? object.filter(fn) : A.filter.call(object, fn); }),
		reduce:      curry(function reduce(fn, n, object) { return object.reduce ? object.reduce(fn, n) : A.reduce.call(object, fn, n); }),
		slice:       curry(function slice(n, m, object) { return object.slice ? object.slice(n, m) : A.slice.call(object, n, m); }),
		sort:        curry(function sort(fn, object) { return object.sort ? object.sort(fn) : A.sort.call(object, fn); }),

		push: curry(function push(stream, object) {
			(stream.push || A.push).apply(stream, object);
			return stream;
		}),

		add:         curry(function add(a, b) { return b + a; }),
		multiply:    curry(function multiply(a, b) { return b * a; }),
		mod:         curry(function mod(a, b) { return b % a; }),
		pow:         curry(function pow(a, b) { return Math.pow(b, a); }),
		min:         curry(function min(a, b) { return a > b ? b : a ; }),
		max:         curry(function max(a, b) { return a < b ? b : a ; }),
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
		match:      curry(function match(regex, string) { return regex.test(string); }),
		exec:       curry(function parse(regex, string) { return regex.exec(string) || undefined; }),
		replace:    curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

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

		toType: function typeOf(object) {
			return typeof object;
		},

		toClass: function classOf(object) {
			return O.toString.apply(object).slice(8, -1);
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

		log: function(text, object) {
			console.log(text, object);
			return x;
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

	function Stream(setup) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var observers = {};

		function notify(type) {
			if (!observers[type]) { return; }
			//(new ReadStream(observers[type])).pull(Fn.run);
			A.slice.apply(observers[type]).forEach(call);
		}

		Object.assign(this, setup(notify));

		if (!this.hasOwnProperty('next')) {
			throw new Error('Fn.Stream: setup() did not provide a .next() method.');
		}

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

		Stream.call(this, function setup(notify) {
			var buffer = typeof object === 'string' ? A.slice.apply(object) : object || [] ;
			var pulling = false;

			return {
				next: function next() {
					var value = buffer.shift();

					if (buffer.status === 'done') {
						this.status = 'done';
					}
					else if (value === undefined) {
						pulling = true;
						notify('pull');
						pulling = false;
						value = buffer.shift();
					}

					return value;
				},

				push: function push() {
					buffer.push.apply(buffer, arguments);
					if (!pulling) { notify('push'); }
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

		of: function() {
			return Fn(arguments);
		},

		next: function error() {
			throw new Error('Fn: Stream has been created without a .next() method.');
		},

		push: function error() {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		pull: function pull(fn) {
			var source = this;

			function flush() {
				var value;

				while ((value = source.next()) !== undefined) {
					fn(value);
				}
			}

			// Flush the source then listen for values
			flush();
			return this.on('push', flush);
		},

		shift: function() {
			return this.next();
		},

		pipe: function(object) {
			// object is either:
			// array -
			// stream -
			// undefined -

			var source = this;
			var stream = object || new BufferStream();

			if (stream.on) {
				// There's something stinky yet elegant about these two.
				stream.on('pull', function() {
					stream.push(source.shift());
				});
			}

			if (source.on) {
				// Notify a push without pushing any values -
				// stream only needs to know values are available.
				source.on('push', stream.push);
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

		map: function(fn) {
			return this.create(Fn.compose(function next(value) {
				return value !== undefined ? fn(value) : undefined ;
			}, this.next));
		},

		filter: function(fn) {
			var source = this;

			return this.create(function filter() {
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

		split: function(fn) {
			var source = this;
			var buffer = [];

			return this.create(function next() {
				var value = source.next();
				var b;

				if (value === undefined) { return; }

				if (fn(value)) {
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

		group: function(fn) {
			var source = this;
			var buffer = [];
			var streams = {};

			fn = fn || Fn.id;

			function create() {
				var stream = new BufferStream();
				buffer.push(stream);
				return stream.on('pull', function() {
					// Pull until a new value is added to the current stream
					pullUntil(Fn.is(stream));
				});
			}

			function pullUntil(check) {
				var value = source.next();
				if (value === undefined) { return; }

				var key = fn(value);
				var stream = streams[key] || (streams[key] = create());
				stream.push(value);

				return check(stream) || pullUntil(check);
			}

			function isBuffered() {
				return !!buffer.length;
			}

			return this.create(function nextStream() {
				// Pull until a new stream is available
				pullUntil(isBuffered);
				return buffer.shift();
			});
		},

		chain: function() {
			var source = this;
			var buffer = [];

			return this.create(function next() {
				var value = buffer.shift();
				if (value !== undefined) { return value; }

				buffer = source.next();
				if (buffer) { return next(); }
				buffer = [];
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

		find: function(fn) {
			var source = this;

			function process() {
				var value;

				while ((value = source.next()) !== undefined && !fn(value));

				if (value !== undefined) {
					// Process is a call once kind of thing
					process = noop;
				}

				return value;
			}

			return this.create(function next() {
				return process();
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

			return this.create(function next() {
				var value = source.next();
				if (value === undefined) { return; }

				if (buffer.indexOf(value) === -1) {
					buffer.push(value);
					return value;
				}

				return next();
			});
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

		delay: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				source.on('push', function() {
					setTimeout(notify, time, 'push');
				});

				return {
					next: function next() {
						return source.next();
					},

					stop: function stop() {
						// Probably should clear timers here.
					}
				};
			});
		},

		throttle: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				var throttle = Fn.Throttle(function() {
					notify('push');
				}, time);

				source.on('push', throttle);

				return {
					next: function next() {
						var value, v;

						while ((v = source.next()) !== undefined) {
							value = v;
						}

						if (source.status === "done") { throttle.cancel(); }

						return value;
					},

					stop: throttle.cancel
				};
			});
		},

		boolify:     function() { return this.map(Boolean); },
		stringify:   function() { return this.map(String); },
		jsonify:     function() { return this.map(JSON.stringify); },
		slugify:     function() { return this.map(Fn.slugify); },

		match:       function(regex) { return this.map(Fn.match(regex)); },
		exec:        function(regex) { return this.map(Fn.exec(regex)); },

		assign:      function(object) { return this.map(Fn.assign(object)); },

		toType:      function() { return this.map(Fn.toType); },
		toClass:     function() { return this.map(Fn.toClass); },
		toStringType: function() { return this.map(Fn.toStringType); },

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
				.on('stop', reject);
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
