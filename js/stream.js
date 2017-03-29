(function(window) {
	"use strict";

	var debug     = true;

	// Import

	var Fn        = window.Fn;
	var A         = Array.prototype;

	var assign    = Object.assign;
	var call      = Fn.call;
	var curry     = Fn.curry;
	var each      = Fn.each;
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
			if (value !== undefined) {
				return value;
			}
		}
	}


	// Construct

	function cloneShift(buffer1, buffer2, shift) {
		return function clone() {
			if (buffer1.length) { return buffer1.shift(); }
			var value = shift();
			if (value !== undefined) { buffer2.push(value); }
			return value;
		};
	}

	function latest(source) {
		var value = source.shift();
		return value === undefined ?
			arguments[1] :
			latest(source, value) ;
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
		var busy   = false;
		var source;

		function initialise() {
			// Allow constructors with `new`?
			source = new setup(function(type) {
				// Prevent nested events, so a 'push' event triggered while
				// the stream is 'pull'ing will do nothing. A bit of a fudge.
				if (busy) { return; }
				busy = true;
				var value = notify(type, stream);
				busy = false;
				return value;
			});

			if (!source.shift) {
				throw new Error('Stream: setup() must return an object with .shift() ' + setup);
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

	Stream.Buffer = function(source) {
		return new Stream(function setup(notify) {
			var buffer = source === undefined ? [] :
				Fn.prototype.isPrototypeOf(source) ? source :
				Array.from(source).filter(isValue) ;

			return {
				shift: function shift() {
					return buffer.length ?
						buffer.shift() :
						notify('pull') ;
				},

				push: function() {
					buffer.push.apply(buffer, arguments);
					notify('push');
				}
			};
		});
	};

	Stream.Combine = function(fn) {
		var sources = A.slice.call(arguments, 1);

		if (sources.length < 2) {
			throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
		}

		return new Stream(function setup(notify) {
			var hot = true;
			var store = sources.map(function(source) {
				var data = {
					source: source,
					listen: listen
				};

				// Listen for incoming values and flag as hot
				function listen() {
					data.value = undefined;
					hot = true;
				}

				source.on('push', listen)
				source.on('push', notify);
				return data;
			});

			function toValue(data) {
				var source = data.source;
				var value  = data.value;
				return data.value = value === undefined ? latest(source) : value ;
			}

			return {
				shift: function combine() {
					// Prevent duplicate values going out the door
					if (!hot) { return; }
					hot = false;

					var values = store.map(toValue);
					return values.every(isValue) && fn.apply(null, values) ;
				},

				stop: function stop() {
					// Remove listeners
					each(function(data) {
						var source = data.source;
						var listen = data.listen;
						source.off('push', listen);
						source.off('push', notify);						
					}, store);

					notify('stop');
				}
			};
		});
	};

	Stream.Merge = function(source1, source2) {
		var args = arguments;
	
		return new Stream(function setup(notify) {
			var values  = [];
			var buffer  = [];
			var sources = Array.from(args);
	
			function update(type, source) {
				buffer.push(source);
			}

			each(function(source) {
				// Flush the source
				values.push.apply(values, toArray(source));

				// Listen for incoming values
				source.on('push', update);
				source.on('push', notify);
			}, sources);

			return {
				shift: function() {
					if (values.length) { return values.shift(); }
					var stream = buffer.shift();
					return stream && stream.shift();
				},

				stop: function() {
					// Remove listeners
					each(function(source) {
						source.off('push', update);
						source.off('push', notify);
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

	Stream.Choke = function(time) {
		return new Stream(function setup(notify) {
			var buffer = [];
			var update = Wait(function() {
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
					update.cancel(false);
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

		combine: function(fn, source) {
			return Stream.Combine(fn, this, source);
		},

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		latest: function() {
			var source = this;
			var stream = Object.create(this);
			var value;

			stream.shift = function() {
				return latest(source);
			};

			return stream;
		},

		//remember: function() {
		//	var source  = this;
		//	var value;
		//
		//	return assign(Object.create(this, {
		//		each: { value: undefined }
		//	}), {
		//		shift: function() {
		//			var val = latest(source);
		//			if (val !== undefined) { value = val; }
		//			return value;
		//		}
		//	});
		//},

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

		reduce: function(fn, seed) {
			return this.fold(fn, seed).latest().shift();
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
