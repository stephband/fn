(function(window) {
	"use strict";

	// Import

	var Fn        = window.Fn;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var isDefined = Fn.isDefined;
	var toArray   = Fn.toArray;


	// Utilities

	function isValue(n) { return n !== undefined; }


	// Events

	var eventsSymbol = Symbol('events');

	function notify(object, type) {
		var events = object[eventsSymbol];

		if (!events) { return; }
		if (!events[type]) { return; }

		var n = -1;
		var l = events[type].length;
		var value;

		while (++n < l) {
			value = events[type][n](type);
			if (value !== undefined) {
				return value;
			}
		}
	}


	// Constructors

	//function create(object, fn) {
	//	var stream = Object.create(object);
	//	stream.shift = fn;
	//	return stream;
	//}

	function cloneShift(buffer1, buffer2, shift) {
		return function clone() {
			if (buffer1.length) { return buffer1.shift(); }
			var value = shift();
			if (value !== undefined) { buffer2.push(value); }
			return value;
		};
	}

	function flush(fn, source) {
		var value = source.shift();
		while (value !== undefined) {
			fn(value);
			value = source.shift();
		}
	}

	function methodise(stream, source) {
		if (source.start) {
			stream.start = function() {
				source.start.apply(start, arguments);
				return stream;
			};
		}
	
		if (source.stop) {
			stream.stop = function() {
				source.stop.apply(stop, arguments);
				return stream;
			};
		}
	}

	function Stream(setup) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var stream = this;
		var source;

		function initialise() {
			source = setup(function(type) { notify(stream, type); });

			if (!source.shift) {
				throw new Error('Stream: setup() must return an object with .shift()');
			}

			methodise(stream, source);
		}

		stream[eventsSymbol] = {};

		this.shift = function() {
			if (!source) { initialise(); }
			return source.shift();
		};

		this.push = function() {
			if (!source) { initialise(); }
			source.push.apply(source, arguments);
			return stream;
		};
	}

	Stream.Buffer = function(array) {
		return new Stream(function setup(notify) {
			var buffer = array === undefined ? [] :
				Fn.prototype.isPrototypeOf(array) ? array :
				Array.from(array).filter(isValue) ;

			return {
				shift: function() {
					return buffer.shift();
				},

				push: function() {
					buffer.push.apply(buffer, arguments);
					notify('push');
				}
			};
		});
	};
	
	Stream.Merge = function() {
		var args = arguments;
	
		return new Stream(function setup(notify) {
			var buffer  = [];
			var sources = Array.from(args);
	
			function push(value) {
				buffer.push(value);
				notify('push');
			}

			var listeners = sources.map(function(source) {
				// Flush the source
				flush(push, source);

				// Listen for incoming values and buffer them into stream
				function listen() { flush(push, source); }
				source.on('push', listen);

				// Remember listeners
				return listen;
			});

			return {
				shift: function() {
					return buffer.shift();
				},

				stop: function() {
					// Remove listeners
					sources.forEach(function(source, i) {
						source.off('push', listeners[i]);
					});
				}
			};
		});
	};
	
	Stream.Events = function(type, node) {
		return new Stream(function setup(notify) {
			var buffer = [];
	
			function push(value) {
				buffer.push(value);
				notify('push');
			}
	
			node.addEventListener(type, push);
	
			return {
				shift: function() {
					return buffer.shift();
				},
	
				stop: function stop() {
					node.removeEventListener(type, push);
				}
			};
		});
	};
	
	
	Stream.Choke = function() {
		return new Stream(function setup() {
			var buffer  = [];
	
			return {
				shift: function() {
					return buffer.shift();
				},
	
				push: Wait(function push() {
					// Get last value and stick it in buffer
					buffer[0] = arguments[arguments.length - 1];
					this.notify('push');
				}, time)
			};
		});
	};

	Stream.Property = function(name, object) {
		return new Stream(function setup() {
			var value;

			function push() {
				value = object[name];
				notify('push');
			}

			observe(object, name, push);

			return {
				shift: function() {
					var v = value;
					value = undefined;
					return v;
				}
			};
		});
	};

	Stream.of   = function() { return Stream.Buffer(arguments); };
	Stream.from = Stream.Buffer;

	Stream.prototype = assign(Object.create(Fn.prototype), {

		// Construct

		clone: function() {
			var source  = this;
			var shift   = source.shift;
			var buffer1 = [];
			var buffer2 = [];

			var stream = new Stream(function setup(notify) {
				source.on('push', notify);
				source.on('stop', notify);

				return {
					shift: cloneShift(buffer2, buffer1, shift),

					push:  function() {
						buffer2.push.apply(buffer2, arguments);
						notify('push');
					},

					stop:  function stop() {
						source.off('push', notify);
						source.off('stop', notify);
					}
				}
			});

			this.shift = cloneShift(buffer1, buffer2, shift);
			return stream;
		},

		// Transform

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		pipe: function(stream) {
			// Target must be writable
			if (!stream || !stream.push) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}

			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},


		// Consume

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


		// Observe

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

		stop: function() {
			notify(this, 'done');
			delete this[eventsSymbol];
		}
	});

	window.Stream = Stream;

})(this);
