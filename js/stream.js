(function(window) {

	// Native

	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var S = String.prototype;
	var Fn = window.Fn;

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


	// Streams

	function Stream(initialise) {
		// Enable calling constructor without the new keyword.
		if (this === window || this === null || this === Fn) {
			return new Stream(initialise);
		}

		var subscriber = noop;

		function push() {
			if (arguments.length === 0 || arguments[0] === undefined) {
				return;
			}

			subscriber.apply(null, arguments);
		}

		this.subscribe = function subscribe(fn) {
			var sn = subscriber;

			subscriber = function() {
				sn.apply(null, arguments);
				fn.apply(null, arguments);
			};

			return this;
		};

		initialise(push);
	}

	Object.assign(Stream.prototype, Fn.Generator.prototype, {
		subscribe: noop,

		log: function() {
			return this.subscribe(console.log.bind(console));
		},

		call: function(name) {
			return this.subscribe(function(object) {
				return name ? object[name]() : object() ;
			});
		},

		map: function(transform) {
			var source = this;
			return new this.constructor(function(push) {
				source.subscribe(Fn.compose(push, transform));
			});
		},

		throttle: function() {
			var source = this;
			return new this.constructor(function(push) {
				source.subscribe(Throttle(push));
			});
		},

		head: function() {
			var source = this;
			return new this.constructor(function(push) {
				source.subscribe(function() {
					push.apply(null, arguments);
					push = noop;
				});
			});
		},

		tail: function() {
			var source = this;
			return new this.constructor(function(push) {
				var p = noop;
				source.subscribe(function() {
					p.apply(null, arguments);
					p = push;
				});
			});
		},

		slice: function(n, m) {
			var source = this;

			n = n === undefined ? 0 : n ;
			m = m === undefined ? Infinity : m ;

			return new this.constructor(function(push) {
				var i = -1;

				source.subscribe(function() {
					if (++i >= n && i < m) {
						push.apply(null, arguments);
					}
				});
			});
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return new this.constructor(function(push) {
				source.subscribe(function(value) {
					fn(value) && push.apply(null, arguments);
				});
			});
		},

		reduce: function(fn) {
			var i = 0, t = 0;
			return this.map(function reduce(value) {
				t = fn(value, t, i++);
				return t;
			});
		},

		unique: function() {
			var source = this;
			return new this.constructor(function(push) {
				var buffer = [];
				source.subscribe(function(value) {
					if (buffer.indexOf(value) === -1) {
						buffer.push(value);
						push(value);
					}
				});
			});
		},

		batch: function(n) {
			var source = this;

			return new Stream(function(push) {
				var buffer = [];

				source.subscribe(function(value) {
					buffer.push(value);

					if (buffer.length >= n) {
						push(buffer);
						buffer = [];
					}
				});
			});
		},

		change: function() {
			var source = this;

			return new this.constructor(function(push) {
				var value;

				source.subscribe(function() {
					if (value !== arguments[0]) {
						value = arguments[0];
						push.apply(null, arguments);
					}
				});
			});
		},

		group: noop,

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
			throw new Error('Fn.Stream is not pushable. ' + input);
		},

		each: noop,
		flatten: noop,
		sort: noop,
		find: noop,
		toFunction: noop,
		toArray: noop
	});

	Fn.Stream = Stream;

})(this);
