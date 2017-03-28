(function(window) {
	"use strict";

	var debug     = true;

	// Import

	var Fn        = window.Fn;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var Timer     = Fn.Timer;
	var Throttle  = Fn.Throttle;
	var toArray   = Fn.toArray;


	// Utilities

	function isValue(n) { return n !== undefined; }


	// Events

	var eventsSymbol = Symbol('events');

	function notify(type, object) {
		var events = object[eventsSymbol];

		if (!events) { return; }
		if (!events[type]) { return; }

		var n = -1;
		var l = events[type].length;
		var value;

		while (++n < l) {
			value = events[type][n](type, object);
			if (value !== undefined) { return value; }
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

	function stop(type, stream) {
		stream.status = 'done';
		delete stream[eventsSymbol];
	}

	function methodise(stream, source) {
		if (source.start) {
			stream.start = function() {
				source.start.apply(stream.start, arguments);
				return stream;
			};
		}
	
		if (source.stop) {
			stream.stop = function() {
				source.stop.apply(stream.stop, arguments);
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
			// Allow constructors with `new`?
			source = new setup(function(type) { notify(type, stream); });

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

		this.on('stop', stop);
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
	
			function update(value) {
				buffer.push(value);
				notify('push');
			}

			var listeners = sources.map(function(source) {
				// Flush the source
				flush(update, source);

				// Listen for incoming values and buffer them into stream
				function listen() { flush(update, source); }
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
	
			function update(value) {
				buffer.push(value);
				notify('push');
			}
	
			node.addEventListener(type, update);
	
			return {
				shift: function() {
					return buffer.shift();
				},
	
				stop: function stop() {
					node.removeEventListener(type, update);
					notify('stop');
				}
			};
		});
	};

	Stream.Choke = function() {
		return new Stream(function setup(notify) {
			var buffer = [];
			var wait = Wait(function() {
				// Get last value and stick it in buffer
				buffer[0] = arguments[arguments.length - 1];
				notify('push');
			}, time);

			return {
				shift: function() {
					return buffer.shift();
				},

				push: update,

				stop: function stop() {
					wait.cancel(false);
					notify('stop');
				}
			};
		});
	};

	Stream.Delay = function(duration) {
		return new Stream(function setup(notify) {
			var buffer = [];
			var timers = [];

			function trigger(values) {
				// Careful! We're assuming that timers fire in the order they
				// were declared, which may not be the case in JS.
				var value;
			
				if (values.length) {
					buffer.push.apply(buffer, values);
				}
				else {
					value = notify('pull');
					if (value === undefined) { return; }
					buffer.push(value);
				}
			
				notify('push');
				timers.shift();
			}

			return {
				shift: function shift() {
					return buffer.shift();
				},
				
				push: function push() {
					timers.push(setTimeout(trigger, duration * 1000, arguments));
				},
				
				stop: function stop() {
					buffer = empty;
					timers.forEach(clearTimeout);
					notify('stop');
				}
			};
		});
	};

	Stream.Throttle = function(request) {
		// If request is a number create a timer, otherwise if request is
		// a function use it, or if undefined, use an animation timer.
		request = typeof request === 'number' ? Timer(request).request :
			typeof request === 'function' ? request :
			requestAnimationFrame ;

		return new Stream(function setup(notify) {
			var buffer  = [];
			var throttle = Throttle(function() {
				buffer[0] = arguments[arguments.length - 1];
				notify('push');
			}, request);

			return {
				shift: function shift() {
					return buffer.shift();
				},
				
				push: throttle,
				
				stop: function stop() {
					buffer = empty;
					throttle.cancel(false);
					notify('stop');
				}
			};
		});
	};

	Stream.Interval = function(request) {
		// If request is a number create a timer, otherwise if request is
		// a function use it, or if undefined, use an animation timer.
		request = typeof request === 'number' ? Timer(request).request :
			typeof request === 'function' ? request :
			requestAnimationFrame ;

		return new Stream(function setup(notify) {
			var buffer  = [];
			var pushed  = [];
			
			function update(control) {
				pushed[0] = buffer.shift();
				notify('push');
			}

			return {
				shift: function shift() {
					var value = pushed.shift();
					if (value !== undefined) {
						timer = request(function() { update(this); });
					}
					return value;
				},

				push: function push() {
					buffer.push.apply(buffer, arguments);
					if (!timer) {
						timer = request(function() { update(this); });
					}
				},

				stop: function stop() {
					pushed = empty;
					update = noop;
					notify('stop');
				}
			};
		});
	};

	Stream.from = Stream.Buffer;

	Stream.of = function() { return Stream.Buffer(arguments); };

	Stream.prototype = assign(Object.create(Fn.prototype), {

		// Construct

		clone: function() {
			var source  = this;
			var shift   = source.shift;
			var buffer1 = [];
			var buffer2 = [];

			this.shift = cloneShift(buffer1, buffer2, shift);

			return new Stream(function setup(notify) {
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
						notify('stop');
					}
				}
			});
		},

		// Transform

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		choke: function(time) {
			return this.pipe(Stream.Choke(time));
		},

		delay: function(time) {
			return this.pipe(Stream.Delay(time));
		},

		throttle: function(request) {
			return this.pipe(Stream.Throttle(request));
		},

		interval: function(request) {
			return this.pipe(Stream.Interval(request));
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

		pipe: function(stream) {
			// Target must be writable
			if (!stream || !stream.push) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}

			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},

		// Control

		on: function(type, fn) {
			var events = this[eventsSymbol];
			if (!events) { return this; }

			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function(type, fn) {
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
			notify('stop', this);
		}
	});

	window.Stream = Stream;

})(this);
