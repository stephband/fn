(function(window) {

	// Native

	var A  = Array.prototype;
	var F  = Function.prototype;
	var N  = Number.prototype;
	var S  = String.prototype;
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

	function Stream(setup) {
		// Enable calling constructor without the new keyword.
		if (this === window || this === null || this === Fn) {
			return new Stream(setup);
		}

		function subscribe(fn) {
			var stream = this;
			var subscriptions = 1;
			var teardown = setup(push) || noop;

			function getSubscriber() { return fn; }

			function push() {
				if (arguments[0] === undefined) { return; }
				// Todo: handle END events?
				//if (arguments[0] === Stream.END) { getSubscriber = returnNoop; }
				getSubscriber().apply(null, arguments);
			}

			function decrement() {
				// When there are no subscriptions tear it down and start again.
				if (--subscriptions < 1) {
					teardown(push);
					stream.subscribe = subscribe;
				}
			}

			// Replace method with one that runs multiple subscribers.
			this.subscribe = function subscribeTail(fn) {
				var gS = getSubscriber;

				++subscriptions;

				getSubscriber = function() {
					return function subscriber() {
						gS().apply(null, arguments);
						fn.apply(null, arguments);
					};
				};

				return function unsubscribe() {
					if (fn === noop) { return; }
					fn = noop;
					decrement();
				};
			};

			return function unsubscribe() {
				if (fn === noop) { return; }
				fn = noop;
				decrement();
			};
		}

		this.subscribe = subscribe;
	}

	Object.assign(Stream.prototype, Fn.Generator.prototype, {

		//	Anatomy of a Stream method:
		//
		//	method: function() {
		//		var source = this;
		//
		//      // Construct a new stream of the same type via this.constructor,
		//      // enabling this prototype to be inherited by other streams.
		// 		// Pass in a fn setup(), which gets called on the first
		//      // call to .subscribe(). It should return a teardown function.
		//		return new this.constructor(function setup(push) {
		//
		//			// Return the unsubscriber returned by .subscribe(), which
		//			// gets used as a teardown.
		//			return source.subscribe(function() {
		//
		//				// Do something logic
		//			});
		//		};
		//	}

		subscribe: noop,

		log: function() {
			this.subscribe(console.log.bind(console));
			return this;
		},

		call: function(name) {
			return this.subscribe(function(fn) {
				return name ? Fn.get(name, fn)() : fn() ;
			});
		},

		// .pipe() accepts any object with a .push() method – like an array, or
		// a writeable stream.
		pipe: function(object) {
			this.subscribe(function() {
				object.push.apply(object, arguments);
			});
		},

		map: function(transform) {
			var source = this;
			return new this.constructor(function(push) {
				return source.subscribe(Fn.compose(push, transform));
			});
		},

		merge: function() {
			var source = this;
			var streams = Fn.slice(0, undefined, arguments);

			return new this.constructor(function(push) {
				var stream = source;

				while (stream) {
					stream.subscribe(push);
					stream = streams.shift();
				}
			});
		},

		throttle: function() {
			var source = this;
			return new this.constructor(function(push) {
				return source.subscribe(Throttle(push));
			});
		},

		head: function() {
			var source = this;
			var ended = false;
			return new this.constructor(function(push) {
				if (ended) { return; }

				var unsubscribe = source.subscribe(function() {
					push.apply(null, arguments);
					unsubscribe();
					ended = true;
					// Todo: send end of stream event?
					// push(Stream.END);
				});

				return unsubscribe;
			});
		},

		tail: function() {
			var source = this;
			return new this.constructor(function(push) {
				var p = noop;
				return source.subscribe(function() {
					p.apply(null, arguments);
					p = push;
				});
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = 0;

			n = n === undefined ? 0 : n ;
			m = m === undefined ? Infinity : m ;

			// .splice() consumes values – ie, it doesn't send teardowns up the
			// chain until it's counted up to m values.
			var unsubscribe = source.subscribe(function() {
				if (++i >= m) {
					unsubscribe();
				}
			});

			return new this.constructor(function(push) {
				if (i >= m) { return noop; }

				var unsubscribe = source.subscribe(function() {
					if (i > n) {
						push.apply(null, arguments);
					}

					if (i >= m) {
						unsubscribe();
						// Todo: send end of stream event?
						// push(Stream.END);
					}
				});

				return unsubscribe;
			});
		},

		filter: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn === undefined ? identity :
				fn ;

			return new this.constructor(function(push) {
				return source.subscribe(function(value) {
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
				return source.subscribe(function(value) {
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

				return source.subscribe(function(value) {
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

				return source.subscribe(function() {
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
