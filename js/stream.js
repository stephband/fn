(function(window) {
	"use strict";

	var debug     = false;


	// Import

	var Fn        = window.Fn;
	var A         = Array.prototype;

	var assign    = Object.assign;
	var call      = Fn.call;
	var curry     = Fn.curry;
	var each      = Fn.each;
	var latest    = Fn.latest;
	var noop      = Fn.noop;
	var now       = Fn.now;
	var nothing   = Fn.nothing;
	var rest      = Fn.rest;
	var throttle  = Fn.throttle;
	var Timer     = Fn.Timer;
	var toArray   = Fn.toArray;


	// Functions

	function isValue(n) { return n !== undefined; }

	function isDone(stream) {
		return stream.status === 'done';
	}

	function checkSource(source) {
		// Check for .shift()
		if (!source.shift) {
			throw new Error('Stream: Source must create an object with .shift() ' + Source);
		}
	}


	// Events

	var $events = Symbol('events');

	function notify(type, object) {
		var events = object[$events];

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

	function createNotify(stream) {
		var _notify = notify;

		return function trigger(type) {
			// Prevent nested events, so a 'push' event triggered while
			// the stream is 'pull'ing will do nothing. A bit of a fudge.
			var notify = _notify;
			_notify = noop;
			var value = notify(type, stream);
			_notify = notify;
			return value;
		};
	}


	// Sources
	//
	// Sources that represent stopping and stopped states of a stream

	var doneSource = {
		shift: noop,
		push:  noop,
		start: noop,
		stop:  noop
	};

	function StopSource(source, n, done) {
		this.source = source;
		this.n      = n;
		this.done   = done;
	}

	assign(StopSource.prototype, doneSource, {
		shift: function() {
			if (--this.n < 1) { this.done(); }
			return this.source.shift();
		}
	});


	// Stream

	function Stream(Source, options) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(Source, options);
		}

		var stream  = this;
		var args    = arguments;
		var getSource;

		var promise = new Promise(function(resolve, reject) {
			var source;

			function done() {
				stream.status = 'done';
				source = doneSource;
			}

			function stop(n, value) {
				// Neuter events and schedule shutdown of the stream
				// after n values
				delete stream[$events];

				if (n) { source = new StopSource(source, n, done); }
				else { done(); }

				// Note that we cannot resolve with stream because Chrome sees
				// it as a promise (resolving with promises is special)
				resolve(value);
			}

			getSource = function() {
				var notify = createNotify(stream);
				source = new Source(notify, stop, options);

				// Check for sanity
				if (debug) { checkSource(source); }

				// Gaurantee that source has a .stop() method
				if (!source.stop) { source.stop = noop; }

				getSource = function() { return source; };

				return source;
			};
		});

		// Properties and methods

		this[$events] = {};

		this.push = function push() {
			var source = getSource();
			source.push.apply(source, arguments);
			return stream;
		};

		this.shift = function shift() {
			return getSource().shift();
		};

		this.start = function start() {
			var source = getSource();
			source.start.apply(source, arguments);
			return stream;
		};

		this.stop = function stop() {
			var source = getSource();
			source.stop.apply(source, arguments);
			return stream;
		};

		this.then = promise.then.bind(promise);
	}


	// Stream Constructors

	function BufferSource(notify, stop, buffer) {
		this._buffer = buffer;
		this._notify = notify;
		this._stop   = stop;
	}

	assign(BufferSource.prototype, {
		shift: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			return buffer.length ? buffer.shift() : notify('pull') ;
		},

		push: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			buffer.push.apply(buffer, arguments);
			notify('push');
		},

		stop: function() {
			var buffer = this._buffer;
			this._stop(buffer.length);
		}
	});

	Stream.from = function(source) {
		return new Stream(function setup(notify, stop) {
			var buffer = source === undefined ? [] :
				Fn.prototype.isPrototypeOf(source) ? source :
				Array.from(source).filter(isValue) ;

			return new BufferSource(notify, stop, buffer);
		});
	};

	Stream.of = function() { return Stream.from(arguments); };


	// Stream.Combine

	function toValue(data) {
		var source = data.source;
		var value  = data.value;
		return data.value = value === undefined ? latest(source) : value ;
	}

	function CombineSource(notify, stop, fn, sources) {
		var object = this;

		this._notify  = notify;
		this._stop    = stop;
		this._fn      = fn;
		this._sources = sources;
		this._hot     = true;

		this._store = sources.map(function(source) {
			var data = {
				source: source,
				listen: listen
			};

			// Listen for incoming values and flag as hot
			function listen() {
				data.value = undefined;
				object._hot = true;
			}

			source.on('push', listen)
			source.on('push', notify);
			return data;
		});
	}

	assign(CombineSource.prototype, {
		shift: function combine() {
			// Prevent duplicate values going out the door
			if (!this._hot) { return; }
			this._hot = false;

			var sources = this._sources;
			var values  = this._store.map(toValue);
			if (sources.every(isDone)) { this._stop(0); }
			return values.every(isValue) && this._fn.apply(null, values) ;
		},

		stop: function stop() {
			var notify = this._notify;

			// Remove listeners
			each(function(data) {
				var source = data.source;
				var listen = data.listen;
				source.off('push', listen);
				source.off('push', notify);						
			}, this._store);

			this._stop(this._hot ? 1 : 0);
		}
	});

	Stream.Combine = function(fn) {
		var sources = A.slice.call(arguments, 1);

		if (sources.length < 2) {
			throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
		}

		return new Stream(function setup(notify, stop) {
			return new CombineSource(notify, stop, fn, sources);
		});
	};


	// Stream.Merge

	function MergeSource(notify, stop, sources) {
		var values = [];
		var buffer = [];

		function update(type, source) {
			buffer.push(source);
		}

		this._notify  = notify;
		this._stop    = stop;
		this._sources = sources;
		this._values  = values;
		this._buffer  = buffer;
		this._i       = 0;
		this._update  = update;

		each(function(source) {
			// Flush the source
			values.push.apply(values, toArray(source));

			// Listen for incoming values
			source.on('push', update);
			source.on('push', notify);
		}, sources);
	}

	assign(MergeSource.prototype, {
		shift: function() {
			var sources = this._sources;
			var values  = this._values;
			var buffer  = this._buffer;
			var stop    = this._stop;

			if (values.length) { return values.shift(); }
			var stream = buffer.shift();
			if (!stream) { return; }
			var value = stream.shift();
			// When all the sources are empty, stop
			if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
			return value;
		},

		stop: function() {
			var notify  = this._notify;
			var sources = this._sources;
			var stop    = this._stop;
			var update  = this._update;

			// Remove listeners
			each(function(source) {
				source.off('push', update);
				source.off('push', notify);
			}, sources);

			stop(values.length + buffer.length);
		}
	});

	Stream.Merge = function(source1, source2) {
		var args = arguments;
	
		return new Stream(function setup(notify, stop) {
			return new MergeSource(notify, stop, Array.from(args));
		});
	};


	// Stream.Events

	Stream.Events = function(type, node) {
		return new Stream(function setup(notify, stop) {
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
					stop(buffer.length);
				}
			};
		});
	};


	// Stream Timers

	Stream.Choke = function(time) {
		return new Stream(function setup(notify, done) {
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
					done();
				}
			};
		});
	};

	function schedule() {
		this.queue = noop;
		var request = this.request;
		this.id = request(this.update);
	}

	function ThrottleSource(notify, stop, request, cancel) {
		this._stop   = stop;
		this.request = request;
		this.cancel  = cancel;
		this.queue   = schedule;

		this.update  = function update() {
			this.queue = schedule;
			notify('push');
		}.bind(this);
	}

	assign(ThrottleSource.prototype, {
		shift: function shift() {
			if (!this.args) { return; }
			var value = this.value;
			this.value = undefined;
			return value;
		},

		stop: function stop(callLast) {
			// An update is queued
			if (this.queue === noop) {
				this.cancel && this.cancel(this.id);
				this.id = undefined;
			}

			// Don't permit further changes to be queued
			this.queue = noop;

			// If there is an update queued apply it now
			// Hmmm. This is weird semantics. TODO: callLast should
			// really be an 'immediate' flag, no?
			this._stop(this.value !== undefined && callLast ? 1 : 0);
		},

		push: function throttle() {
			// Store the latest value
			this.value = arguments[arguments.length - 1];

			// Queue the update
			this.queue();
		}
	});

	Stream.throttle = function(request, cancel) {
		request = request || requestAnimationFrame;
		cancel  = cancel  || cancelAnimationFrame;

		return new Stream(function(notify, stop) {
			return new ThrottleSource(notify, stop, request, cancel);
		});
	};



	var frameTimer = {
		now:     now,
		request: requestAnimationFrame,
		cancel:  cancelAnimationFrame
	};

	function ClockSource(notify, stop, options) {
		// requestAnimationFrame/cancelAnimationFrame cannot be invoked
		// with context, so need to be referenced.

		var source  = this;
		var request = options.request;

		function frame(time) {
			source.value = time;
			notify('push');
			source.value = undefined;
			source.id    = request(frame);
		}

		this.cancel = options.cancel || noop;
		this.end    = stop;

		// Start clock
		this.id = request(frame);
	}

	assign(ClockSource.prototype, {
		shift: function shift() {
			var value = this.value;
			this.value = undefined;
			return value;
		},

		stop: function stop() {
			var cancel = this.cancel;
			cancel(this.id);
			this.end();
		}
	});

	Stream.clock = function ClockStream(options) {
		var timer = typeof options === 'number' ?
			new Timer(options) :
			options || frameTimer ;

		return new Stream(ClockSource, timer);
	};


	// Stream Methods

	Stream.prototype = assign(Object.create(Fn.prototype), {
		clone: function() {
			var source  = this;
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			var stream  = new Stream(function setup(notify, stop) {
				var buffer = buffer2;

				source.on('push', notify);

				return {
					shift: function() {
						if (buffer.length) { return buffer.shift(); }
						var value = shift();

						if (value !== undefined) { buffer1.push(value); }
						else if (source.status === 'done') {
							stop(0);
							source.off('push', notify);
						}

						return value;
					},

					stop: function() {
						var value;

						// Flush all available values into buffer
						while ((value = shift()) !== undefined) {
							buffer.push(value);
							buffer1.push(value);
						}

						stop(buffer.length);
						source.off('push', notify);
					}
				};
			});

			this.then(stream.stop);

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }
				var value = shift();
				if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
				return value;
			};

			return stream;
		},

		combine: function(fn, source) {
			return Stream.Combine(fn, this, source);
		},

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		choke: function(time) {
			return this.pipe(Stream.Choke(time));
		},

		throttle: function(timer) {
			return this.pipe(Stream.throttle(timer));
		},

		clock: function(timer) {
			return this.pipe(Stream.clock(timer));
		},


		// Consume

		each: function(fn) {
			var args   = arguments;
			var source = this;

			// Flush and observe
			Fn.prototype.each.apply(source, args);

			return this.on('push', function each() {
				// Delegate to Fn#each().
				Fn.prototype.each.apply(source, args);
			});
		},

		pipe: function(stream) {
			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},


		// Events

		on: function(type, fn) {
			var events = this[$events];
			if (!events) { return this; }

			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function(type, fn) {
			var events = this[$events];
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
		}
	});


	// Export

	window.Stream = Stream;

})(this);
