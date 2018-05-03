var Fn = (function (exports) {
	'use strict';

	(function(window) {

		var assign         = Object.assign;
		var define         = Object.defineProperty;
		var isFrozen       = Object.isFrozen;

		var A              = Array.prototype;

		var $original      = Symbol('original');
		var $observable    = Symbol('observable');
		var $observers     = Symbol('observers');
		var $update        = Symbol('update');

		var DOMObject      = window.EventTarget || window.Node;
		var nothing        = Object.freeze([]);
		var rname          = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?\.?/g;


		// Utils

		function noop() {}

		function isArrayLike(object) {
			return object
			&& typeof object !== 'function'
			&& object.hasOwnProperty('length')
			&& typeof object.length === 'number' ;
		}

		function isObservable(object) {
			// Many built-in objects and DOM objects bork when calling their
			// methods via a proxy. They should be considered not observable.
			// I wish there were a way of whitelisting rather than
			// blacklisting, but it would seem not.

			return object
				// Reject primitives, null and other frozen objects
				&& !isFrozen(object)
				// Reject DOM nodes, Web Audio context and nodes, MIDI inputs,
				// XMLHttpRequests, which all inherit from EventTarget
				&& !DOMObject.prototype.isPrototypeOf(object)
				// Reject dates
				&& !(object instanceof Date)
				// Reject regex
				&& !(object instanceof RegExp)
				// Reject maps
				&& !(object instanceof Map)
				&& !(object instanceof WeakMap)
				// Reject sets
				&& !(object instanceof Set)
				&& !(window.WeakSet ? object instanceof WeakSet : false)
				// Reject TypedArrays and DataViews
				&& !ArrayBuffer.isView(object) ;
		}

		function getObservers(object, name) {
			return object[$observers][name]
				|| (object[$observers][name] = []);
		}

		function removeObserver(observers, fn) {
			var i = observers.indexOf(fn);
			observers.splice(i, 1);
		}

		function fire(observers, value, record) {
			if (!observers) { return; }

			// Todo: What happens if observers are removed during this operation?
			// Bad things, I'll wager.
			var n = -1;
			while (observers[++n]) {
				observers[n](value, record);
			}
		}


		// Proxy

		var createProxy = window.Proxy ? (function() {
			function trapGet(target, name, self) {
				var value = target[name];
	//console.log('TRAP GET', value);
				// Ignore symbols
				return typeof name === 'symbol' ? value :
	//				typeof value === 'function' ? MethodProxy(value) :
	//console.log('this', this);
	//console.log('target', target);
	//console.log('arguments', arguments);
	//					value.apply(this, arguments);
	//				} :
					Observable(value) || value ;
			}

			var arrayHandlers = {
				get: trapGet,

				set: function(target, name, value, receiver) {
					// We are setting a symbol
					if (typeof name === 'symbol') {
						target[name] = value;
						return true;
					}

					var old = target[name];
					var length = target.length;

					// If we are setting the same value, we're not really setting at all
					if (old === value) { return true; }

					var observers = target[$observers];
					var change;

					// We are setting length
					if (name === 'length') {
						if (value >= target.length) {
							// Don't allow array length to grow like this
							//target.length = value;
							return true;
						}

						change = {
							index:   value,
							removed: A.splice.call(target, value),
							added:   nothing,
						};

						while (--old >= value) {
							fire(observers[old], undefined);
						}
					}

					// We are setting an integer string or number
					else if (+name % 1 === 0) {
						name = +name;

						if (value === undefined) {
							if (name < target.length) {
								change = {
									index:   name,
									removed: A.splice.call(target, name, 1),
									added:   nothing
								};

								value = target[name];
							}
							else {
								return true;
							}
						}
						else {
							change = {
								index:   name,
								removed: A.splice.call(target, name, 1, value),
								added:   [value]
							};
						}
					}

					// We are setting some other key
					else {
						target[name] = value;
					}

					if (target.length !== length) {
						fire(observers.length, target.length);
					}

					fire(observers[name], Observable(value) || value);
					fire(observers[$update], receiver, change);

					// Return true to indicate success
					return true;
				}
			};

			var objectHandlers = {
				get: trapGet,

				set: function(target, name, value, receiver) {
					var old = target[name];

					// If we are setting the same value, we're not really setting at all
					if (old === value) { return true; }

					var observers = target[$observers];
					var change = {
						name:    name,
						removed: target[name],
						added:   value
					};

					target[name] = value;

					fire(observers[name], Observable(value) || value);
					fire(observers[$update], receiver, change);

					// Return true to indicate success
					return true;
				}

	//			apply: function(target, context, args) {
	//console.log('MethodProxy', target, context, args);
	//debugger;
	//				return Reflect.apply(target, context, args);
	//			}
			};

			return function createProxy(object) {
				var proxy = new Proxy(object, isArrayLike(object) ?
					arrayHandlers :
					objectHandlers
				);

				define(object, $observers, { value: {} });
				define(object, $observable, { value: proxy });

				return proxy;
			};
		})() : (function() {
			// Code for IE, whihc does not support Proxy

			function ArrayProxy(array) {
				this[$observable] = this;
				this[$original]   = array;
				this[$observers]  = array[$observers];

				assign(this, array);
				this.length = array.length;
			}

			define(ArrayProxy.prototype, 'length', {
				set: function(length) {
					var array = this[$original];

					if (length >= array.length) { return; }

					while (--array.length > length) {
						this[array.length] = undefined;
					}

					this[array.length] = undefined;

					//console.log('LENGTH', length, array.length, JSON.stringify(this))

					//array.length = length;
					notify(this, '');
				},

				get: function() {
					return this[$original].length;
				},

				configurable: true
			});

			assign(ArrayProxy.prototype, {
				filter:  function() { return A.filter.apply(this[$original], arguments); },
				find:    function() { return A.find.apply(this[$original], arguments); },
				map:     function() { return A.map.apply(this[$original], arguments); },
				reduce:  function() { return A.reduce.apply(this[$original], arguments); },
				concat:  function() { return A.concat.apply(this[$original], arguments); },
				slice:   function() { return A.slice.apply(this[$original], arguments); },
				some:    function() { return A.some.apply(this[$original], arguments); },
				indexOf: function() { return A.indexOf.apply(this[$original], arguments); },
				forEach: function() { return A.forEach.apply(this[$original], arguments); },
				toJSON:  function() { return this[$original]; },

				sort: function() {
					A.sort.apply(this[$original], arguments);
					assign(this, array);
					this.length = array.length;
					notify(this, '');
					return this;
				},

				push: function() {
					var array = this[$original];
					var value = A.push.apply(array, arguments);
					assign(this, array);
					this.length = array.length;
					console.log('PUSH', JSON.stringify(arguments));
					notify(this, '');
					return value;
				},

				pop: function() {
					var array = this[$original];
					var value = A.pop.apply(array, arguments);
					assign(this, array);
					this.length = array.length;
					notify(this, '');
					return value;
				},

				shift: function() {
					var array = this[$original];
					var value = A.shift.apply(array, arguments);
					assign(this, array);
					this.length = array.length;
					notify(this, '');
					return value;
				},

				splice: function() {
					var array = this[$original];
					var value = A.splice.apply(array, arguments);
					assign(this, array);
					this.length = array.length;
					notify(this, '');
					return value;
				}
			});

			return function createNoProxy(object) {
				var proxy;

				if (isArrayLike(object)) {
					define(object, $observers, { value: {} });
					proxy = isArrayLike(object) ? new ArrayProxy(object) : object ;
				}
				else {
					proxy = object;
				}

				define(object, $observable, { value: proxy });
				return proxy;
			};
		})() ;


		// observe

		function observePrimitive(object, fn) {
			if (object !== fn.value) {
				fn.value = object;
				fn(object);
			}

			return noop;
		}

		function observeObject(object, fn) {
			var observers = getObservers(object, $update);
			var old       = fn.value;

			observers.push(fn);

			if (object !== fn.value) {
				fn.value = object;
				fn(object, {
					index:   0,
					removed: old ? old : nothing,
					added:   object
				});
			}

			return function unobserveObject() {
				removeObserver(observers, fn);
			};
		}

		function observeItem(object, key, match, path, fn) {
			var unobserve = noop;

			function isMatch(item) {
				return item[key] === match;
			}

			function update(array) {
				var value = array && A.find.call(array, isMatch);
				unobserve();
				unobserve = observe(value, path, fn);
			}

			var unobserveObject = observeObject(object, update);

			return function unobserveItem() {
				unobserve();
				unobserveObject();
			};
		}

		var observeProperty = window.Proxy ? function observeProperty(object, name, path, fn) {
			var observers = getObservers(object, name);
			var unobserve = noop;

			function update(value) {
				unobserve();
				unobserve = observe(value, path, fn);
			}

			observers.push(update);
			update(object[name]);

			return function unobserveProperty() {
				unobserve();
				removeObserver(observers, update);
			};
		} : function observePropertyNoProxy(object, name, path, fn) {
			var unobserve = noop;

			function update(value) {
				unobserve();
				unobserve = observe(value, path, fn);
			}

			var _unobserve = window.observe(object[$observable] || object, name, update);
			update(object[name]);

			return function() {
				unobserve();
				_unobserve();
			};
		} ;

		function callbackItem(object, key, match, path, fn) {
			function isMatch(item) {
				return item[key] === match;
			}

			var value = object && A.find.call(object, isMatch);
			return observe(Observable(value) || value, path, fn);
		}

		function callbackProperty(object, name, path, fn) {
			return observe(Observable(object[name]) || object[name], path, fn);
		}

		function observe(object, path, fn) {
			if (!path.length) {
				// We can assume the full isObservable() check has been done, as
				// this function is only called internally or from Object.observe
				//
				// The object[$observers] check is for IE - it checks whether the
				// object is observable for muteability.
				return object && object[$observable] && object[$observers] ?
					observeObject(object, fn) :
					observePrimitive(object, fn) ;
			}

			if (!(object && typeof object === 'object')) {
				return observePrimitive(undefined, fn);
			}

			rname.lastIndex = 0;
			var tokens = rname.exec(path);

			if (!tokens) {
				throw new Error('Observable: invalid path "' + path + '"');
			}

			var name  = tokens[1];
			var match = tokens[3] && (
				tokens[2] ?
					tokens[3] :
					parseFloat(tokens[3])
			);

			path = path.slice(rname.lastIndex);

			return object[$observable] ?
				match ?
					observeItem(object, name, match, path, fn) :
					observeProperty(object, name, path, fn) :
				match ?
					callbackItem(object, name, match, path, fn) :
					callbackProperty(object, name, path, fn) ;
		}


		// Observable

		function Observable(object) {
			return !object ? undefined :
				object[$observable] ? object[$observable] :
				!isObservable(object) ? undefined :
			createProxy(object) ;
		}

		Observable.isObservable = isObservable;

		Observable.notify = function notify(object, path) {
			var observers = object[$observers];
			fire(observers[path], object[$observable]);
			fire(observers[$update], object);
		};

		Observable.observe = function(object, path, fn) {
			// Coerce path to string
			return observe(Observable(object) || object, path + '', fn);
		};

		// Experimental

		Observable.filter = function(fn, array) {
			var subset = Observable([]);

			Observable.observe(array, '', function() {
				var filtered = array.filter(fn);
				assign(subset, filtered);
				subset.length = filtered.length;
			});

			return subset;
		};

		Observable.map = function(fn, array) {
			var subset = Observable([]);

			Observable.observe(array, '', function(observable) {
				var filtered = array.map(fn);
				assign(subset, filtered);
				subset.length = filtered.length;
			});

			return subset;
		};


		// Export

		window.Observable = Observable;

	})(window);

	const DEBUG$1 = true;

	/*
	function curry(fn, muteable, arity) {
	    arity = arity || fn.length;

	    var memo = arity === 1 ?
	        // Don't cache if `muteable` flag is true
	        muteable ? fn : cache(fn) :

	        // It's ok to always cache intermediate memos, though
	        cache(function(object) {
	            return curry(function() {
	                var args = [object];
	                args.push.apply(args, arguments);
	                return fn.apply(null, args);
	            }, muteable, arity - 1) ;
	        }) ;

	    return function partial(object) {
	        return arguments.length === 0 ?
	            partial :
	        arguments.length === 1 ?
	            memo(object) :
	        arguments.length === arity ?
	            fn.apply(null, arguments) :
	        arguments.length > arity ?
	            applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
	        applyFn(memo(object), A.slice.call(arguments, 1)) ;
	    };
	}
	*/

	function curry(fn) {
	    var parity = fn.length;
	    return function curried() {
	        return arguments.length >= parity ?
	            fn.apply(null, arguments) :
	            curried.bind(null, ...arguments) ;
	    };
	}


	if (DEBUG$1) {
	    const _curry = curry;

	    // Feature test
		const isFunctionLengthDefineable = (function() {
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

	    const setFunctionProperties = function setFunctionProperties(text, parity, fn1, fn2) {
	        // Make the string representation of fn2 display parameters of fn1
	        fn2.toString = function() {
	            return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
	        };

	        // Where possible, define length so that curried functions show how
	        // many arguments they are yet expecting
	        if (isFunctionLengthDefineable) {
	            Object.defineProperty(fn2, 'length', { value: parity });
	        }

	        return fn2;
	    };

	    // Make curried functions log a pretty version of their partials
	    curry = function curry(fn, muteable, arity) {
	        arity  = arity || fn.length;
	        return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
	    };
	}


	var curry$1 = curry;

	function args() { return arguments; }

	const DEBUG$2 = false;

	function cache(fn) {
	    var map = new Map();

	    return function cache(object) {
	        if (DEBUG$2 && arguments.length > 1) {
	            throw new Error('Fn: cache() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
	        }

	        if (map.has(object)) {
	            return map.get(object);
	        }

	        var value = fn(object);
	        map.set(object, value);
	        return value;
	    };
	}

	// choke
	//
	// Returns a function that waits for `time` seconds without being invoked
	// before calling `fn` using the context and arguments from the latest
	// invocation

	function choke(fn, time) {
	    var timer, context, args;
	    var cue = function cue() {
	        if (timer) { clearTimeout(timer); }
	        timer = setTimeout(update, (time || 0) * 1000);
	    };

	    function update() {
	        timer = false;
	        fn.apply(context, args);
	    }

	    function cancel() {
	        // Don't permit further changes to be queued
	        cue = noop;

	        // If there is an update queued apply it now
	        if (timer) { clearTimeout(timer); }
	    }

	    function wait() {
	        // Store the latest context and arguments
	        context = this;
	        args = arguments;

	        // Cue the update
	        cue();
	    }

	    wait.cancel = cancel;
	    return wait;
	}

	// Choke or wait? A simpler implementation without cancel(), I leave this here for reference...
	//	function choke(seconds, fn) {
	//		var timeout;
	//
	//		function update(context, args) {
	//			fn.apply(context, args);
	//		}
	//
	//		return function choke() {
	//			clearTimeout(timeout);
	//			timeout = setTimeout(update, seconds * 1000, this, arguments);
	//		};
	//	}

	function rest(i, object) {
	    if (object.slice) { return object.slice(i); }
	    if (object.rest)  { return object.rest(i); }

	    var a = [];
	    var n = object.length - i;
	    while (n--) { a[n] = object[n + i]; }
	    return a;
	}

	function choose(map) {
	    return function choose(key) {
	        var fn = map[key] || map.default;
	        return fn && fn.apply(this, rest(1, arguments)) ;
	    };
	}

	function compose(fn2, fn1) {
	    return function compose() {
	        return fn2(fn1.apply(null, arguments));
	    };
	}

	function deprecate(fn, message) {
	    // Recall any function and log a depreciation warning
	    return function deprecate() {
	        console.warn('Deprecation warning: ' + message);
	        return fn.apply(this, arguments);
	    };
	}

	function id(object) { return object; }

	function isDefined(value) {
	    // !!value is a fast out for non-zero numbers, non-empty strings
	    // and other objects, the rest checks for 0, '', etc.
	    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
	}

	function last(array) {
	    if (typeof array.length === 'number') {
	        return array[array.length - 1];
	    }

	    // Todo: handle Fns and Streams
	}

	function latest(source) {
	    var value = source.shift();
	    return value === undefined ? arguments[1] : latest(source, value) ;
	}

	function noop$1() {}

	var nothing$1 = Object.freeze(Object.defineProperties([], {
	   shift: { value: noop$1 }
	}));

	function now() {
	    // Return time in seconds
	    return +new Date() / 1000;
	}

	function once$1(fn) {
	    return function once() {
	        var value = fn.apply(this, arguments);
	        fn = noop$1;
	        return value;
	    };
	}

	function overload(fn, map) {
	    return typeof map.get === 'function' ?
	        function overload() {
	            var key = fn.apply(null, arguments);
	            return map.get(key).apply(this, arguments);
	        } :
	        function overload() {
	            var key = fn.apply(null, arguments);
	            return (map[key] || map.default).apply(this, arguments);
	        } ;
	}

	const A$1 = Array.prototype;

	function call(value, fn) {
	    return fn(value);
	}

	function pipe() {
	    const fns = arguments;
	    return function pipe(value) {
	        return A$1.reduce.call(fns, call, value);
	    };
	}

	const resolved = Promise.resolve();

	function requestTick(fn) {
	    resolved.then(fn);
	    return true;
	}

	function self() { return this; }

	function toArray$1(object) {
	    if (object.toArray) { return object.toArray(); }

	    // Speed test for array conversion:
	    // https://jsperf.com/nodelist-to-array/27

	    var array = [];
	    var l = object.length;
	    var i;

	    if (typeof object.length !== 'number') { return array; }

	    array.length = l;

	    for (i = 0; i < l; i++) {
	        array[i] = object[i];
	    }

	    return array;
	}

	function toClass(object) {
	    return O.toString.apply(object).slice(8, -1);
	}

	function toInt(object) {
	    return object === undefined ?
	        undefined :
	        parseInt(object, 10);
	}

	function toString(object) {
		return object.toString();
	}

	function toType(object) {
	    return typeof object;
	}

	function weakCache(fn) {
	    var map = new WeakMap();

	    return function weakCache(object) {
	        if (DEBUG && arguments.length > 1) {
	            throw new Error('Fn: weakCache() called with ' + arguments.length + ' arguments. Accepts exactly 1.');
	        }

	        if (map.has(object)) {
	            return map.get(object);
	        }

	        var value = fn(object);
	        map.set(object, value);
	        return value;
	    };
	}

	const assign = Object.assign;

	function isDone(source) {
	    return source.length === 0 || source.status === 'done' ;
	}

	function create(object, fn) {
	    var functor = Object.create(object);
	    functor.shift = fn;
	    return functor;
	}

	function Fn$1(fn) {
	    // Accept constructor without `new`
	    if (!this || !Fn$1.prototype.isPrototypeOf(this)) {
	        return new Fn$1(fn);
	    }

	    var source = this;

	    if (!fn) {
	        source.status = 'done';
	        return;
	    }

	    var value = fn();

	    if (value === undefined) {
	        source.status = 'done';
	        return;
	    }

	    this.shift = function shift() {
	        if (source.status === 'done') { return; }

	        var v = value;

	        // Where the next value is undefined mark the functor as done
	        value = fn();
	        if (value === undefined) {
	            source.status = 'done';
	        }

	        return v;
	    };
	}


	assign(Fn$1, {

	    // Constructors

	    of: function() { return Fn$1.from(arguments); },

	    from: function(object) {
	        var i;

	        // object is an array or array-like object. Iterate over it without
	        // mutating it.
	        if (typeof object.length === 'number') {
	            i = -1;

	            return new Fn$1(function shiftArray() {
	                // Ignore undefined holes in arrays
	                return ++i >= object.length ?
	                    undefined :
	                object[i] === undefined ?
	                    shiftArray() :
	                    object[i] ;
	            });
	        }

	        // object is an object with a shift function
	        if (typeof object.shift === "function" && object.length === undefined) {
	            return new Fn$1(function shiftObject() {
	                return object.shift();
	            });
	        }

	        // object is an iterator
	        if (typeof object.next === "function") {
	            return new Fn$1(function shiftIterator() {
	                var result = object.next();

	                // Ignore undefined holes in iterator results
	                return result.done ?
	                    result.value :
	                result.value === undefined ?
	                    shiftIterator() :
	                    result.value ;
	            });
	        }

	        throw new Error('Fn: from(object) object is not a list of a known kind (array, functor, stream, iterator).')
	    }
	});

	assign(Fn$1.prototype, {
	    shift: noop$1,

	    // Input

	    of: function() {
	        // Delegate to the constructor's .of()
	        return this.constructor.of.apply(this.constructor, arguments);
	    },

	    // Transform

	    ap: function(object) {
	        var shift = this.shift;

	        return create(this, function ap() {
	            var fn = shift();
	            return fn === undefined ?
	                undefined :
	                object.map(fn) ;
	        });
	    },

	    unshift: function() {
	        // Create an unshift buffer, such that objects can be inserted
	        // back into the stream at will with stream.unshift(object).
	        var source = this;
	        var buffer = toArray(arguments);

	        return create(this, function() {
	            return (buffer.length ? buffer : source).shift() ;
	        });
	    },

	    catch: function(fn) {
	        var source = this;

	        return create(this, function() {
	            try {
	                return source.shift();
	            }
	            catch(e) {
	                return fn(e);
	            }
	        });
	    },

	    chain: function(fn) {
	        return this.map(fn).join();
	    },

	    clone: function() {
	        var source  = this;
	        var shift   = this.shift;
	        var buffer1 = [];
	        var buffer2 = [];
	        var doneFlag = false;

	        // Messy. But it works. Just.

	        this.shift = function() {
	            var value;

	            if (buffer1.length) {
	                value = buffer1.shift();

	                if (!buffer1.length && doneFlag) {
	                    source.status = 'done';
	                }

	                return value;
	            }

	            if (!doneFlag) {
	                value = shift();

	                if (source.status === 'done') {
	                    doneFlag = true;
	                }

	                if (value !== undefined) {
	                    buffer2.push(value);
	                }

	                return value;
	            }
	        };

	        var clone = new Fn$1(function shiftClone() {
	            var value;

	            if (buffer2.length) {
	                return buffer2.shift();
	                //if (!buffer2.length && doneFlag) {
	                //	clone.status = 'done';
	                //}
	            }

	            if (!doneFlag) {
	                value = shift();

	                if (source.status === 'done') {
	                    doneFlag = true;
	                    source.status = undefined;
	                }

	                if (value !== undefined) {
	                    buffer1.push(value);
	                }

	                return value;
	            }
	        });

	        return clone;
	    },

	    concat: function() {
	        var sources = toArray(arguments);
	        var source  = this;

	        var stream  = create(this, function concat() {
	            if (source === undefined) {
	                stream.status = 'done';
	                return;
	            }

	            if (isDone(source)) {
	                source = sources.shift();
	                return concat();
	            }

	            var value = source.shift();

	            stream.status = sources.length === 0 && isDone(source) ?
	                'done' : undefined ;

	            return value;
	        });

	        return stream;
	    },

	    dedup: function() {
	        var v;
	        return this.filter(function(value) {
	            var old = v;
	            v = value;
	            return old !== value;
	        });
	    },

	    filter: function(fn) {
	        var source = this;

	        return create(this, function filter() {
	            var value;
	            while ((value = source.shift()) !== undefined && !fn(value));
	            return value;
	        });
	    },

	    first: function() {
	        var source = this;
	        return create(this, once(function first() {
	            source.status = 'done';
	            return source.shift();
	        }));
	    },

	    join: function() {
	        var source = this;
	        var buffer = nothing;

	        return create(this, function join() {
	            var value = buffer.shift();
	            if (value !== undefined) { return value; }
	            buffer = source.shift();
	            if (buffer !== undefined) { return join(); }
	            buffer = nothing;
	        });
	    },

	    latest: function() {
	        var source = this;
	        return create(this, function shiftLast() {
	            return latest(source);
	        });
	    },

	    map: function(fn) {
	        return create(this, compose(function map(object) {
	            return object === undefined ? undefined : fn(object) ;
	        }, this.shift));
	    },

	    chunk: function(n) {
	        var source = this;
	        var buffer = [];

	        return create(this, n ?
	            // If n is defined batch into arrays of length n.
	            function shiftChunk() {
	                var value, _buffer;

	                while (buffer.length < n) {
	                    value = source.shift();
	                    if (value === undefined) { return; }
	                    buffer.push(value);
	                }

	                if (buffer.length >= n) {
	                    _buffer = buffer;
	                    buffer = [];
	                    return Fn$1.of.apply(Fn$1, _buffer);
	                }
	            } :

	            // If n is undefined or 0, batch all values into an array.
	            function shiftChunk() {
	                buffer = source.toArray();
	                // An empty array is equivalent to undefined
	                return buffer.length ? buffer : undefined ;
	            }
	        );
	    },

	    fold: function(fn, seed) {
	        var i = 0;
	        return this
	        .map(function fold(value) {
	            seed = fn(seed, value, i++);
	            return seed;
	        })
	        .unshift(seed);
	    },

	    partition: function(fn) {
	        var source = this;
	        var buffer = [];
	        var streams = new Map();

	        fn = fn || Fn$1.id;

	        function createPart(key, value) {
	            var stream = Stream.of().on('pull', shiftPull);
	            stream.key = key;
	            streams.set(key, stream);
	            return stream;
	        }

	        function shiftPull(type, pullStream) {
	            var value  = source.shift();
	            if (value === undefined) { return; }

	            var key    = fn(value);
	            var stream = streams.get(key);

	            if (stream === pullStream) { return value; }

	            if (stream === undefined) {
	                stream = createPart(key, value);
	                buffer.push(stream);
	            }

	            stream.push(value);
	            return shiftPull(type, pullStream);
	        }

	        return create(this, function shiftStream() {
	            if (buffer.length) { return buffer.shift(); }

	            var value = source.shift();
	            if (value === undefined) { return; }

	            var key    = fn(value);
	            var stream = streams.get(key);

	            if (stream === undefined) {
	                stream = createPart(key, value);
	                stream.push(value);
	                return stream;
	            }

	            stream.push(value);
	            return shiftStream();
	        });
	    },

	    reduce: function reduce(fn, seed) {
	        return this.fold(fn, seed).latest().shift();
	    },

	    take: function(n) {
	        var source = this;
	        var i = 0;

	        return create(this, function take() {
	            var value;

	            if (i < n) {
	                value = source.shift();
	                // Only increment i where an actual value has been shifted
	                if (value === undefined) { return; }
	                if (++i === n) { source.status = 'done'; }
	                return value;
	            }
	        });
	    },

	    sort: function(fn) {
	        fn = fn || Fn$1.byGreater ;

	        var source = this;
	        var buffer = [];

	        return create(this, function sort() {
	            var value;

	            while((value = source.shift()) !== undefined) {
	                sortedSplice(buffer, fn, value);
	            }

	            return buffer.shift();
	        });
	    },

	    split: function(fn) {
	        var source = this;
	        var buffer = [];

	        return create(this, function split() {
	            var value = source.shift();
	            var temp;

	            if (value === undefined) {
	                if (buffer.length) {
	                    temp = buffer;
	                    buffer = [];
	                    return temp;
	                }

	                return;
	            }

	            if (fn(value)) {
	                temp = buffer;
	                buffer = [value];
	                return temp.length ? temp : split() ;
	            }

	            buffer.push(value);
	            return split();
	        });
	    },

	    syphon: function(fn) {
	        var shift   = this.shift;
	        var buffer1 = [];
	        var buffer2 = [];

	        this.shift = function() {
	            if (buffer1.length) { return buffer1.shift(); }

	            var value;

	            while ((value = shift()) !== undefined && fn(value)) {
	                buffer2.push(value);
	            }

	            return value;
	        };

	        return create(this, function filter() {
	            if (buffer2.length) { return buffer2.shift(); }

	            var value;

	            while ((value = shift()) !== undefined && !fn(value)) {
	                buffer1.push(value);
	            }

	            return value;
	        });
	    },

	    rest: function(i) {
	        var source = this;

	        return create(this, function rest() {
	            while (i-- > 0) { source.shift(); }
	            return source.shift();
	        });
	    },

	    unique: function() {
	        var source = this;
	        var values = [];

	        return create(this, function unique() {
	            var value = source.shift();

	            return value === undefined ? undefined :
	                values.indexOf(value) === -1 ? (values.push(value), value) :
	                unique() ;
	        });
	    },

	    // Consumers

	    each: function(fn) {
	        var value;

	        while ((value = this.shift()) !== undefined) {
	            fn.call(this, value);
	        }

	        return this;
	    },

	    find: function(fn) {
	        return this
	        .filter(fn)
	        .first()
	        .shift();
	    },

	    next: function() {
	        return {
	            value: this.shift(),
	            done:  this.status
	        };
	    },

	    pipe: function(stream) {
	        // Target must be evented
	        if (!stream || !stream.on) {
	            throw new Error('Fn: Fn.pipe(object) object must be a stream. (' + stream + ')');
	        }

	        return stream.on('pull', this.shift);
	    },

	    tap: function(fn) {
	        // Overwrite shift to copy values to tap fn
	        this.shift = Fn$1.compose(tap(fn), this.shift);
	        return this;
	    },

	    toJSON: function() {
	        return this.reduce(arrayReducer, []);
	    },

	    toString: function() {
	        return this.reduce(prepend, '');
	    },


	    // Deprecated

	    process: deprecate(function(fn) {
	        return fn(this);
	    }, '.process() is deprecated'),

	    last: deprecate(function() {
	        var source = this;
	        return create(this, function shiftLast() {
	            return latest(source);
	        });
	    }, '.last() is now .latest()'),
	});

	Fn$1.prototype.toArray = Fn$1.prototype.toJSON;

	// Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
	//
	// equals: 'fantasy-land/equals',
	// lte: 'fantasy-land/lte',
	// concat: 'fantasy-land/concat',
	// empty: 'fantasy-land/empty',
	// map: 'fantasy-land/map',
	// contramap: 'fantasy-land/contramap',
	// ap: 'fantasy-land/ap',
	// of: 'fantasy-land/of',
	// alt: 'fantasy-land/alt',
	// zero: 'fantasy-land/zero',
	// reduce: 'fantasy-land/reduce',
	// traverse: 'fantasy-land/traverse',
	// chain: 'fantasy-land/chain',
	// chainRec: 'fantasy-land/chainRec',
	// extend: 'fantasy-land/extend',
	// extract: 'fantasy-land/extract',
	// bimap: 'fantasy-land/bimap',
	// promap: 'fantasy-land/promap'


	if (window.Symbol) {
	    // A functor is it's own iterator
	    Fn$1.prototype[Symbol.iterator] = function() {
	        return this;
	    };
	}

	function each(fn, object) {
	    // A stricter version of .forEach, where the callback fn
	    // gets a single argument and no context.
	    var l, n;

	    if (typeof object.each === 'function') {
	        object.each(fn);
	    }
	    else {
	        l = object.length;
	        n = -1;
	        while (++n < l) { fn(object[n]); }
	    }

	    return object;
	}

	// Timer

	function Timer(duration, getTime) {
	    if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

	    // Optional second argument is a function that returns
	    // current time (in seconds)
	    getTime = getTime || now;

	    var fns = [];
	    var id;
	    var t0  = -Infinity;

	    function frame() {
	        var n = fns.length;

	        id = undefined;
	        t0 = getTime();

	        while (n--) {
	            fns.shift()(t0);
	        }
	    }

	    return {
	        now: getTime,

	        request: function(fn) {
	            if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

	            // Add fn to queue
	            fns.push(fn);

	            // If the timer is cued do nothing
	            if (id) { return; }

	            var t1 = getTime();

	            // Set the timer and return something truthy
	            if (t0 + duration > t1) {
	                id = setTimeout(frame, (t0 + duration - t1) * 1000);
	            }
	            else {
	                requestTick(frame) ;
	            }

	            // Use the fn reference as the request id, because why not
	            return fn;
	        },

	        cancel: function(fn) {
	            var i = fns.indexOf(fn);
	            if (i === -1) { return; }

	            fns.splice(i, 1);

	            if (!fns.length) {
	                clearTimeout(id);
	                id = undefined;
	            }
	        }
	    };
	}

	var debug     = false;
	var A$2         = Array.prototype;
	var assign$1    = Object.assign;


	// Functions

	function call$1(value, fn) {
	    return fn(value);
	}

	function isValue(n) { return n !== undefined; }

	function isDone$1(stream) {
	    return stream.status === 'done';
	}

	function checkSource(source) {
	    // Check for .shift()
	    if (!source.shift) {
	        throw new Error('Stream: Source must create an object with .shift() ' + source);
	    }
	}


	// Events

	var $events = Symbol('events');

	function notify$1(type, object) {
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
	    var _notify = notify$1;

	    return function trigger(type) {
	        // Prevent nested events, so a 'push' event triggered while
	        // the stream is 'pull'ing will do nothing. A bit of a fudge.
	        var notify = _notify;
	        _notify = noop$1;
	        var value = notify(type, stream);
	        _notify = notify;
	        return value;
	    };
	}


	// Sources
	//
	// Sources that represent stopping and stopped states of a stream

	var doneSource = {
	    shift: noop$1,
	    push:  noop$1,
	    start: noop$1,
	    stop:  noop$1
	};

	function StopSource(source, n, done) {
	    this.source = source;
	    this.n      = n;
	    this.done   = done;
	}

	assign$1(StopSource.prototype, doneSource, {
	    shift: function() {
	        if (--this.n < 1) { this.done(); }
	        return this.source.shift();
	    }
	});


	// Stream

	function Stream$1(Source, options) {
	    // Enable construction without the `new` keyword
	    if (!Stream$1.prototype.isPrototypeOf(this)) {
	        return new Stream$1(Source, options);
	    }

	    var stream  = this;
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
	            if (!source.stop) { source.stop = noop$1; }

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

	assign$1(BufferSource.prototype, {
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

	Stream$1.from = function(source) {
	    return new Stream$1(function setup(notify, stop) {
	        var buffer = source === undefined ? [] :
	            Fn$1.prototype.isPrototypeOf(source) ? source :
	            Array.from(source).filter(isValue) ;

	        return new BufferSource(notify, stop, buffer);
	    });
	};

	Stream$1.of = function() { return Stream$1.from(arguments); };


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

	        source.on('push', listen);
	        source.on('push', notify);
	        return data;
	    });
	}

	assign$1(CombineSource.prototype, {
	    shift: function combine() {
	        // Prevent duplicate values going out the door
	        if (!this._hot) { return; }
	        this._hot = false;

	        var sources = this._sources;
	        var values  = this._store.map(toValue);
	        if (sources.every(isDone$1)) { this._stop(0); }
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

	Stream$1.Combine = function(fn) {
	    var sources = A$2.slice.call(arguments, 1);

	    if (sources.length < 2) {
	        throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
	    }

	    return new Stream$1(function setup(notify, stop) {
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
	        values.push.apply(values, toArray$1(source));

	        // Listen for incoming values
	        source.on('push', update);
	        source.on('push', notify);
	    }, sources);
	}

	assign$1(MergeSource.prototype, {
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

	Stream$1.Merge = function(source1, source2) {
	    var args = arguments;

	    return new Stream$1(function setup(notify, stop) {
	        return new MergeSource(notify, stop, Array.from(args));
	    });
	};


	// Stream.Events

	Stream$1.Events = function(type, node) {
	    return new Stream$1(function setup(notify, stop) {
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

	Stream$1.Choke = function(time) {
	    return new Stream$1(function setup(notify, done) {
	        var value;
	        var update = choke(function() {
	            // Get last value and stick it in buffer
	            value = arguments[arguments.length - 1];
	            notify('push');
	        }, time);

	        return {
	            shift: function() {
	                var v = value;
	                value = undefined;
	                return v;
	            },

	            push: update,

	            stop: function stop() {
	                update.cancel(false);
	                done();
	            }
	        };
	    });
	};



	// Frame timer

	var frameTimer = {
	    now:     now,
	    request: requestAnimationFrame.bind(window),
	    cancel:  cancelAnimationFrame.bind(window)
	};


	// Stream timer

	function StreamTimer(stream) {
	    var timer = this;
	    var fns0  = [];
	    var fns1  = [];
	    this.fns = fns0;

	    stream.each(function() {
	        timer.fns = fns1;
	        fns0.reduce(call$1, undefined);
	        fns0.length = 0;
	        fns1 = fns0;
	        fns0 = timer.fns;
	    });
	}

	assign$1(StreamTimer.prototype, {
	    request: function(fn) {
	        this.fns.push(fn);
	        return fn;
	    },

	    cancel: function(fn) {
	        remove(this.fns, fn);
	    }
	});


	// Stream.throttle

	function schedule() {
	    var timer   = this.timer;

	    this.queue = noop$1;
	    this.ref   = timer.request(this.update);
	}

	function ThrottleSource(notify, stop, timer) {
	    var source   = this;

	    this._stop   = stop;
	    this.timer   = timer;
	    this.queue   = schedule;
	    this.update  = function update() {
	        source.queue = schedule;
	        notify('push');
	    };
	}

	assign$1(ThrottleSource.prototype, {
	    shift: function shift() {
	        var value = this.value;
	        this.value = undefined;
	        return value;
	    },

	    stop: function stop(callLast) {
	        var timer = this.timer;

	        // An update is queued
	        if (this.queue === noop$1) {
	            timer.cancel && timer.cancel(this.ref);
	            this.ref = undefined;
	        }

	        // Don't permit further changes to be queued
	        this.queue = noop$1;

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

	Stream$1.throttle = function(timer) {
	    if (typeof timer === 'function') {
	        throw new Error('Dont accept request and cancel functions anymore');
	    }

	    timer = typeof timer === 'number' ?
	        new Timer(timer) :
	    timer instanceof Stream$1 ?
	        new StreamTimer(timer) :
	    timer ? timer :
	        frameTimer ;

	    return new Stream$1(function(notify, stop) {
	        return new ThrottleSource(notify, stop, timer);
	    });
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

	    this.cancel = options.cancel || noop$1;
	    this.end    = stop;

	    // Start clock
	    this.id = request(frame);
	}

	assign$1(ClockSource.prototype, {
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

	Stream$1.clock = function ClockStream(options) {
	    var timer = typeof options === 'number' ?
	        new Timer(options) :
	        options || frameTimer ;

	    return new Stream$1(ClockSource, timer);
	};


	// Stream Methods

	Stream$1.prototype = assign$1(Object.create(Fn$1.prototype), {
	    clone: function() {
	        var source  = this;
	        var shift   = this.shift;
	        var buffer1 = [];
	        var buffer2 = [];

	        var stream  = new Stream$1(function setup(notify, stop) {
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
	        return Stream$1.Combine(fn, this, source);
	    },

	    merge: function() {
	        var sources = toArray$1(arguments);
	        sources.unshift(this);
	        return Stream$1.Merge.apply(null, sources);
	    },

	    choke: function(time) {
	        return this.pipe(Stream$1.Choke(time));
	    },

	    throttle: function(timer) {
	        return this.pipe(Stream$1.throttle(timer));
	    },

	    clock: function(timer) {
	        return this.pipe(Stream$1.clock(timer));
	    },


	    // Consume

	    each: function(fn) {
	        var args   = arguments;
	        var source = this;

	        // Flush and observe
	        Fn$1.prototype.each.apply(source, args);

	        return this.on('push', function each$$1() {
	            // Delegate to Fn#each().
	            Fn$1.prototype.each.apply(source, args);
	        });
	    },

	    pipe: function(stream) {
	        this.each(stream.push);
	        return Fn$1.prototype.pipe.apply(this, arguments);
	    },


	    // Events

	    on: function(type, fn) {
	        var events = this[$events];
	        if (!events) { return this; }

	        var listeners = events[type] || (events[type] = []);
	        listeners.push(fn);
	        return this;
	    },

	    off: function off(type, fn) {
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

	function set(key, object, value) {
	    return typeof object.set === "function" ?
	        object.set(key, value) :
	        (object[key] = value) ;
	}

	var rpath  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

	function findByProperty(key, value, array) {
	    var l = array.length;
	    var n = -1;

	    while (++n < l) {
	        if (array[n][key] === value) {
	            return array[n];
	        }
	    }
	}


	/* Get path */

	function getRegexPathThing(regex, path, object, fn) {
	    var tokens = regex.exec(path);

	    if (!tokens) {
	        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
	    }

	    var key      = tokens[1];
	    var property = tokens[3] ?
	        findByProperty(key,
	            tokens[2] ? tokens[3] :
	            tokens[4] ? Boolean(tokens[4]) :
	            parseFloat(tokens[5]),
	        object) :
	        object[key] ;

	    return fn(regex, path, property);
	}

	function getRegexPath(regex, path, object) {
	    return regex.lastIndex === path.length ?
	        object :
	    !(object && typeof object === 'object') ?
	        undefined :
	    getRegexPathThing(regex, path, object, getRegexPath) ;
	}

	function getPath(path, object) {
	    rpath.lastIndex = 0;
	    return getRegexPath(rpath, path, object) ;
	}


	/* Set path */

	function setRegexPath(regex, path, object, thing) {
	    var tokens = regex.exec(path);

	    if (!tokens) {
	        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
	    }

	    var key = tokens[1];

	    if (regex.lastIndex === path.length) {
	        // Cannot set to [prop=value] selector
	        if (tokens[3]) {
	            throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
	        }

	        return object[key] = thing;
	    }

	    var value = tokens[3] ?
	        findByProperty(key,
	            tokens[2] ? tokens[3] :
	            tokens[4] ? Boolean(tokens[4]) :
	            parseFloat(tokens[5])
	        ) :
	        object[key] ;

	    if (!(value && typeof value === 'object')) {
	        value = {};

	        if (tokens[3]) {
	            if (object.push) {
	                value[key] = tokens[2] ?
	                    tokens[3] :
	                    parseFloat(tokens[3]) ;

	                object.push(value);
	            }
	            else {
	                throw new Error('Not supported');
	            }
	        }

	        set(key, object, value);
	    }

	    return setRegexPath(regex, path, value, thing);
	}

	function setPath(path, object, value) {
	    rpath.lastIndex = 0;
	    return setRegexPath(rpath, path, object, value);
	}

	const Observable = window.Observable;

	function ObserveSource(end, object, path) {
		this.observable = Observable(object);
		this.path       = path;
		this.end        = end;
	}

	ObserveSource.prototype = {
		shift: function() {
			var value = this.value;
			this.value = undefined;
			return value;
		},

		push: function() {
			setPath(this.path, this.observable, arguments[arguments.length - 1]);
		},

		stop: function() {
			this.unobserve();
			this.end();
		},

		unobserve: noop$1
	};

	function observable(path, object) {
		return new Stream$1(function setup(notify, stop) {
			var source = new ObserveSource(stop, object, path);

			function update(v) {
				source.value = v === undefined ? null : v ;
				notify('push');
			}

			source.unobserve = Observable.observe(object, path, update);
			return source;
		});
	}

	function call$2(fn) {
		return fn();
	}

	// Just for debugging
	var loggers = [];

	// Pool
	function Pool(options, prototype) {
		var create = options.create || noop$1;
		var reset  = options.reset  || noop$1;
		var isIdle = options.isIdle;
		var store = [];

		// Todo: This is bad! It keeps a reference to the pools hanging around,
		// accessible from the global scope, so even if the pools are forgotten
		// they are never garbage collected!
		loggers.push(function log() {
			var total = store.length;
			var idle  = store.filter(isIdle).length;
			return {
				name:   options.name,
				total:  total,
				active: total - idle,
				idle:   idle
			};
		});

		return function PoolObject() {
			var object = store.find(isIdle);

			if (!object) {
				object = Object.create(prototype || null);
				create.apply(object, arguments);
				store.push(object);
			}

			reset.apply(object, arguments);
			return object;
		};
	}

	Pool.release = function() {
		loggers.length = 0;
	};

	Pool.snapshot = function() {
		return Fn
		.from(loggers)
		.map(call$2)
		.toJSON();
	};

	function contains(value, object) {
	    return object.includes ?
	        object.includes(value) :
	    object.contains ?
	        object.contains(value) :
	    A.includes ?
	        A.includes.call(object, value) :
	        A.indexOf.call(object, value) !== -1 ;
	}

	function equals(a, b) {
	    // Fast out if references are for the same object
	    if (a === b) { return true; }

	    // Or if values are not objects
	    if (a === null ||
	        b === null ||
	        typeof a !== 'object' ||
	        typeof b !== 'object') {
	        return false;
	    }

	    var akeys = Object.keys(a);
	    var bkeys = Object.keys(b);

	    // Are their enumerable keys different?
	    if (akeys.length !== bkeys.length) { return false; }

	    var n = akeys.length;

	    while (n--) {
	        if (!equals(a[akeys[n]], b[akeys[n]])) {
	            return false;
	        }
	    }

	    return true;
	}

	function get(key, object) {
	    // Todo? Support WeakMaps and Maps and other map-like objects with a
	    // get method - but not by detecting the get method
	    return object[key] === null ?
	        undefined :
	        object[key] ;
	}

	var _is = Object.is || function is(a, b) { return a === b; };

	function invoke(name, values, object) {
	    return object[name].apply(object, values);
	}

	function nth(n, object) {
	    return object[n];
	}

	function distribute(fns, object, data) {
	    var n = -1;

	    while (++n < data.length) {
	        if (data[n] !== undefined && fns[n]) {
	            object = fns[n](object, data[n], data);
	        }
	    }

	    return object;
	}

	var _parse = curry$1(function parse(regex, fns, output, string) {
	    var data;

	    if (typeof string !== 'string') {
	        data   = string;
	        string = data.input.slice(data.index + data[0].length);
	    }

	    var result = regex.exec(string);

	    if (!result) {
	        throw new Error('Sparky: unable to parse "' + string + '" with ' + regex);
	    }

	    output = distribute(fns, output, result);

	    // Call the close fn
	    if (fns.close) {
	        output = fns.close(output, result);
	    }

	    // Update outer result's index
	    if (data) {
	        data.index += result.index + result[0].length;
	    }

	    return output;
	});

	function remove$1(array, value) {
	    if (array.remove) { array.remove(value); }
	    var i = array.indexOf(value);
	    if (i !== -1) { array.splice(i, 1); }
	}

	const N     = Number.prototype;
	const isNaN = Number.isNaN;

	function toFixed(n, value) {
	    if (isNaN(value)) {
	        throw new Error('Fn.toFixed does not accept NaN.');
	    }

	    return N.toFixed.call(value, n);
	}

	function append(string1, string2) {
	    return '' + string2 + string1;
	}

	function prepend$1(string1, string2) {
	    return '' + string1 + string2;
	}

	function slugify(string) {
	    if (typeof string !== 'string') { return; }
	    return string.trim().toLowerCase().replace(/[\W_]/g, '-');
	}

	function add(a, b) { return b + a; }function multiply(a, b) { return b * a; }function min(a, b) { return a > b ? b : a ; }function max(a, b) { return a < b ? b : a ; }function pow(n, x) { return Math.pow(x, n); }function exp(n, x) { return Math.pow(n, x); }function log(n, x) { return Math.log(x) / Math.log(n); }function root(n, x) { return Math.pow(x, 1/n); }
	function mod(d, n) {
	    // JavaScript's modulu operator % uses Euclidean division, but for
	    // stuff that cycles through 0 the symmetrics of floored division
	    // are more useful.
	    // https://en.wikipedia.org/wiki/Modulo_operation
	    var value = n % d;
	    return value < 0 ? value + d : value ;
	}
	function limit(min, max, n) {
	    return n > max ? max : n < min ? min : n ;
	}
	function todB(n) { return 20 * Math.log10(n); }function toLevel(n) { return Math.pow(2, n/6); }function toRad(n) { return n / angleFactor; }function toDeg(n) { return n * angleFactor; }

	function normalise(min, max, n) { return (n - min) / (max - min); }

	function denormalise(min, max, n) { return n * (max - min) + min; }

	function createOrdinals(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	var langs = {
		'en': {
			days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
			months:   ('January February March April May June July August September October November December').split(' '),
			ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
		},

		'fr': {
			days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
			months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
			ordinals: createOrdinals({ n: "ième", 1: "er" })
		},

		'de': {
			days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
			months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
			ordinals: createOrdinals({ n: "er" })
		},

		'it': {
			days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
			months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
			ordinals: createOrdinals({ n: "o" })
		}
	};


	// Date string parsing
	//
	// Don't parse date strings with the JS Date object. It has variable
	// time zone behaviour. Set up our own parsing.
	//
	// Accept BC dates by including leading '-'.
	// (Year 0000 is 1BC, -0001 is 2BC.)
	// Limit months to 01-12
	// Limit dates to 01-31

	var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
	//                sign   year        month       day               T or -
	var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

	var parseDate = overload(toType, {
		number:  secondsToDate,
		string:  exec(rdate, createDate),
		object:  function(date) {
			return isValidDate(date) ? date : undefined ;
		},
		default: noop$1
	});

	var parseDateLocal = overload(toType, {
		number:  secondsToDate,
		string:  exec(rdate, createDateLocal),
		object:  function(date) {
			return date instanceof Date ? date : undefined ;
		},
		default: noop$1
	});

	function isValidDate(date) {
		return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
	}

	function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
		// Month must be 0-indexed for the Date constructor
		month = parseInt(month, 10) - 1;

		var date = new Date(
			ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
			second ? Date.UTC(year, month, day, hour, minute, second) :
			minute ? Date.UTC(year, month, day, hour, minute) :
			hour ?   Date.UTC(year, month, day, hour) :
			day ?    Date.UTC(year, month, day) :
			month ?  Date.UTC(year, month) :
			Date.UTC(year)
		);

		if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
			setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
		}

		return date;
	}

	function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
		if (zone) {
			throw new Error('Time.parseDateLocal() will not parse a string with a time zone "' + zone + '".');
		}

		// Month must be 0-indexed for the Date constructor
		month = parseInt(month, 10) - 1;

		return ms ?  new Date(year, month, day, hour, minute, second, ms) :
			second ? new Date(year, month, day, hour, minute, second) :
			minute ? new Date(year, month, day, hour, minute) :
			hour ?   new Date(year, month, day, hour) :
			day ?    new Date(year, month, day) :
			month ?  new Date(year, month) :
			new Date(year) ;
	}

	function exec(regex, fn, error) {
		return function exec(string) {
			var parts = regex.exec(string);
			if (!parts && error) { throw error; }
			return parts ?
				fn.apply(null, parts) :
				undefined ;
		};
	}

	function secondsToDate(n) {
		return new Date(secondsToMilliseconds(n));
	}

	function setTimeZoneOffset(sign, hour, minute, date) {
		if (sign === '+') {
			date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
			if (minute) {
				date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
			}
		}
		else if (sign === '-') {
			date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
			if (minute) {
				date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
			}
		}

		return date;
	}



	// Date object formatting
	//
	// Use the internationalisation methods for turning a date into a UTC or
	// locale string, the date object for turning them into a local string.

	var dateFormatters = {
		YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
		YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
		MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
		MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
		MMMM: function(date, lang) { return langs[lang || Time.lang].months[date.getMonth()]; },
		D:    function(date)       { return '' + date.getDate(); },
		DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
		ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
		dddd: function(date, lang) { return langs[lang || Time.lang].days[date.getDay()]; },
		hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
		//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
		mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
		ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
		sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
		ms:   function(date)       { return '' + date.getMilliseconds(); },

		// Experimental
		am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
		zz:   function(date) {
			return (date.getTimezoneOffset() < 0 ? '+' : '-') +
				 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
		},
		th:   function(date, lang) { return langs[lang || Time.lang].ordinals[date.getDate()]; },
		n:    function(date) { return +date; },
		ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
	};

	var componentFormatters = {
		YYYY: function(data)       { return data.year; },
		YY:   function(data)       { return ('0' + data.year).slice(-2); },
		MM:   function(data)       { return data.month; },
		MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
		MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
		D:    function(data)       { return parseInt(data.day, 10) + ''; },
		DD:   function(data)       { return data.day; },
		ddd:  function(data)       { return data.weekday.slice(0,3); },
		dddd: function(data, lang) { return data.weekday; },
		hh:   function(data)       { return data.hour; },
		//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
		mm:   function(data)       { return data.minute; },
		ss:   function(data)       { return data.second; },
		//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
		//ms:   function(data)       { return '' + date.getMilliseconds(); },
	};

	var componentKeys = {
		// Components, in order of appearance in the locale string
		'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
		// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
		// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
		default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
	};

	var options = {
		// Time zone
		timeZone:      'UTC',
		// Use specified locale matcher
		formatMatcher: 'basic',
		// Use 24 hour clock
		hour12:        false,
		// Format string components
		weekday:       'long',
		year:          'numeric',
		month:         '2-digit',
		day:           '2-digit',
		hour:          '2-digit',
		minute:        '2-digit',
		second:        '2-digit',
		//timeZoneName:  'short'
	};

	var rtoken    = /([YZMDdhmswz]{2,4}|\+-)/g;
	var rusdate   = /\w{3,}|\d+/g;
	var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

	function matchEach(regex, fn, text) {
		var match = regex.exec(text);

		return match ? (
			fn.apply(null, match),
			matchEach(regex, fn, text)
		) :
		undefined ;
	}

	function toLocaleString(timezone, locale, date) {
		options.timeZone = timezone || 'UTC';
		var string = date.toLocaleString(locale, options);
		return string;
	}

	function toLocaleComponents(timezone, locale, date) {
		var localedate = toLocaleString(timezone, locale, date);
		var components = {};
		var keys       = componentKeys[locale] || componentKeys.default;
		var i          = 0;

		matchEach(rusdate, function(value) {
			components[keys[i++]] = value;
		}, localedate);

		return components;
	}

	function _formatDate(string, timezone, locale, date) {
		// Derive lang from locale
		var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

		// Todo: only en-US and fr supported for the time being
		locale = locale === 'en' ? 'en-US' :
			locale ? locale :
			'en-US';

		var data    = toLocaleComponents(timezone, locale, date);
		var formats = componentFormatters;

		return string.replace(rtoken, function($0) {
			return formats[$0] ? formats[$0](data, lang) : $0 ;
		});
	}

	function formatDateLocal(string, locale, date) {
		var formatters = dateFormatters;
		var lang = locale.slice(0, 2);

		// Use date formatters to get time as current local time
		return string.replace(rtoken, function($0) {
			return formatters[$0] ? formatters[$0](date, lang) : $0 ;
		});
	}

	function formatDateISO(date) {
		return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
	}

	function formatDateTimeISO(date) {
		return JSON.stringify(parseDate(date)).slice(1,-1);
	}


	// Time operations

	var days   = {
		mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
	};

	var dayMap = [6,0,1,2,3,4,5];

	function toDay(date) {
		return dayMap[date.getDay()];
	}

	function cloneDate(date) {
		return new Date(+date);
	}

	function addDateComponents(sign, yy, mm, dd, date) {
		date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

		if (!mm) { return; }

		// Adding and subtracting months can give weird results with the JS
		// date object. For example, taking a montha way from 2018-03-31 results
		// in 2018-03-03 (or the 31st of February), whereas adding a month on to
		// 2018-05-31 results in the 2018-07-01 (31st of June).
		//
		// To mitigate this weirdness track the target month and roll days back
		// until the month is correct, like Python's relativedelta utility:
		// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
		var month       = date.getUTCMonth();
		var monthDiff   = sign * parseInt(mm, 10);
		var monthTarget = mod(12, month + monthDiff);

		date.setUTCMonth(month + monthDiff);

		// If the month is too far in the future scan backwards through
		// months until it fits. Setting date to 0 means setting to last
		// day of previous month.
		while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

		if (!dd) { return; }

		date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
	}

	function _addDate(duration, date) {
		// Don't mutate the original date
		date = cloneDate(date);

		// First parse the date portion duration and add that to date
		var tokens = rdatediff.exec(duration) ;
		var sign = 1;

		if (tokens) {
			sign = tokens[1] === '-' ? -1 : 1 ;
			addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

			// If there is no 'T' separator go no further
			if (!tokens[5]) { return date; }

			// Prepare duration for time parsing
			duration = duration.slice(tokens[0].length);

			// Protect against parsing a stray sign before time
			if (duration[0] === '-') { return date; }
		}

		// Then parse the time portion and add that to date
		var time = parseTimeDiff(duration);
		if (time === undefined) { return; }

		date.setTime(date.getTime() + sign * time * 1000);
		return date;
	}

	function diff(t, d1, d2) {
		var y1 = d1.getUTCFullYear();
		var m1 = d1.getUTCMonth();
		var y2 = d2.getUTCFullYear();
		var m2 = d2.getUTCMonth();

		if (y1 === y2 && m1 === m2) {
			return t + d2.getUTCDate() - d1.getUTCDate() ;
		}

		t += d2.getUTCDate() ;

		// Set to last date of previous month
		d2.setUTCDate(0);
		return diff(t, d1, d2);
	}

	function _diffDateDays(date1, date2) {
		var d1 = parseDate(date1);
		var d2 = parseDate(date2);

		return d2 > d1 ?
			// 3rd argument mutates, so make sure we get a clean date if we
			// have not just made one.
			diff(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
			diff(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
	}

	function floorDateByGrain(grain, date) {
		var diff, week;

		if (grain === 'ms') { return date; }

		date.setUTCMilliseconds(0);
		if (grain === 'second') { return date; }

		date.setUTCSeconds(0);
		if (grain === 'minute') { return date; }

		date.setUTCMinutes(0);
		if (grain === 'hour') { return date; }

		date.setUTCHours(0);
		if (grain === 'day') { return date; }

		if (grain === 'week') {
			date.setDate(date.getDate() - toDay(date));
			return date;
		}

		if (grain === 'fortnight') {
			week = floorDateByDay(1, new Date());
			diff = mod(14, _diffDateDays(week, date));
			date.setUTCDate(date.getUTCDate() - diff);
			return date;
		}

		date.setUTCDate(1);
		if (grain === 'month') { return date; }

		date.setUTCMonth(0);
		if (grain === 'year') { return date; }

		date.setUTCFullYear(0);
		return date;
	}

	function floorDateByDay(day, date) {
		var currentDay = date.getUTCDay();

		// If we are on the specified day, return this date
		if (day === currentDay) { return date; }

		var diff = currentDay - day;
		if (diff < 0) { diff = diff + 7; }
		return _addDate('-0000-00-0' + diff, date);
	}

	function _floorDate(grain, date) {
		// Clone date before mutating it
		date = cloneDate(date);

		// Take a day string or number, find the last matching day
		var day = typeof grain === 'number' ?
			grain :
			days[grain] ;

		return isDefined(day) ?
			floorDateByDay(day, date) :
			floorDateByGrain(grain, date) ;
	}



	function nowDate() {
		return new Date();
	}
	function dateDiff(d1, d2) {
		return +parseDate(d2) - +parseDate(d1);
	}
	function toTimestamp(date) {
		return date.getTime() / 1000;
	}
	const addDate = curry$1(function(diff, date) {
		return _addDate(diff, parseDate(date));
	});

	const diffDateDays = curry$1(_diffDateDays);

	const floorDate = curry$1(function(token, date) {
		return _floorDate(token, parseDate(date));
	});

	const formatDate = curry$1(function(string, timezone, locale, date) {
		return string === 'ISO' ?
			formatDateISO(parseDate(date)) :
		timezone === 'local' ?
			formatDateLocal(string, locale, date) :
		_formatDate(string, timezone, locale, parseDate(date)) ;
	});


	// Time

	// Decimal places to round to when comparing times
	var precision = 9;

	function millisecondsToSeconds(n) { return n / 1000; }
	function minutesToSeconds(n) { return n * 60; }
	function hoursToSeconds(n) { return n * 3600; }
	function daysToSeconds(n) { return n * 86400; }
	function weeksToSeconds(n) { return n * 604800; }

	function secondsToMilliseconds(n) { return n * 1000; }
	function secondsToMinutes(n) { return n / 60; }
	function secondsToHours(n) { return n / 3600; }
	function secondsToDays(n) { return n / 86400; }
	function secondsToWeeks(n) { return n / 604800; }

	function prefix(n) {
		return n >= 10 ? '' : '0';
	}

	// Hours:   00-23 - 24 should be allowed according to spec
	// Minutes: 00-59 -
	// Seconds: 00-60 - 60 is allowed, denoting a leap second

	//var rtime   = /^([+-])?([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d|60)(?:.(\d+))?)?)?$/;
	//                sign   hh       mm           ss
	var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
	var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

	var parseTime = overload(toType, {
		number:  id,
		string:  exec(rtime, createTime),
		default: function(object) {
			throw new Error('parseTime() does not accept objects of type ' + (typeof object));
		}
	});

	var parseTimeDiff = overload(toType, {
		number:  id,
		string:  exec(rtimediff, createTime),
		default: function(object) {
			throw new Error('parseTime() does not accept objects of type ' + (typeof object));
		}
	});

	var _floorTime = choose({
		week:   function(time) { return time - mod(604800, time); },
		day:    function(time) { return time - mod(86400, time); },
		hour:   function(time) { return time - mod(3600, time); },
		minute: function(time) { return time - mod(60, time); },
		second: function(time) { return time - mod(1, time); }
	});

	var timeFormatters = {
		'+-': function sign(time) {
			return time < 0 ? '-' : '' ;
		},

		www: function www(time) {
			time = time < 0 ? -time : time;
			var weeks = Math.floor(secondsToWeeks(time));
			return prefix(weeks) + weeks;
		},

		dd: function dd(time) {
			time = time < 0 ? -time : time;
			var days = Math.floor(secondsToDays(time));
			return prefix(days) + days;
		},

		hhh: function hhh(time) {
			time = time < 0 ? -time : time;
			var hours = Math.floor(secondsToHours(time));
			return prefix(hours) + hours;
		},

		hh: function hh(time) {
			time = time < 0 ? -time : time;
			var hours = Math.floor(secondsToHours(time % 86400));
			return prefix(hours) + hours;
		},

		mm: function mm(time) {
			time = time < 0 ? -time : time;
			var minutes = Math.floor(secondsToMinutes(time % 3600));
			return prefix(minutes) + minutes;
		},

		ss: function ss(time) {
			time = time < 0 ? -time : time;
			var seconds = Math.floor(time % 60);
			return prefix(seconds) + seconds ;
		},

		sss: function sss(time) {
			time = time < 0 ? -time : time;
			var seconds = time % 60;
			return prefix(seconds) + toMaxDecimals(precision, seconds);
		},

		ms: function ms(time) {
			time = time < 0 ? -time : time;
			var ms = Math.floor(secondsToMilliseconds(time % 1));
			return ms >= 100 ? ms :
				ms >= 10 ? '0' + ms :
				'00' + ms ;
		}
	};

	function createTime(match, sign, hh, mm, sss) {
		var time = hoursToSeconds(parseInt(hh, 10)) + (
			mm ? minutesToSeconds(parseInt(mm, 10)) + (
				sss ? parseFloat(sss, 10) : 0
			) : 0
		);

		return sign === '-' ? -time : time ;
	}

	function formatTimeString(string, time) {
		return string.replace(rtoken, function($0) {
			return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
		}) ;
	}

	function _formatTimeISO(time) {
		var sign = time < 0 ? '-' : '' ;

		if (time < 0) { time = -time; }

		var hours = Math.floor(time / 3600);
		var hh = prefix(hours) + hours ;
		time = time % 3600;
		if (time === 0) { return sign + hh + ':00'; }

		var minutes = Math.floor(time / 60);
		var mm = prefix(minutes) + minutes ;
		time = time % 60;
		if (time === 0) { return sign + hh + ':' + mm; }

		var sss = prefix(time) + toMaxDecimals(precision, time);
		return sign + hh + ':' + mm + ':' + sss;
	}

	function toMaxDecimals(precision, n) {
		// Make some effort to keep rounding errors under control by fixing
		// decimals and lopping off trailing zeros
		return n.toFixed(precision).replace(/\.?0+$/, '');
	}





	const nowTime = function() {
		return window.performance.now();
	};

	const formatTime = curry$1(function(string, time) {
		return string === 'ISO' ?
			_formatTimeISO(parseTime(time)) :
			formatTimeString(string, parseTime(time)) ;
	});

	const formatTimeISO = function(time) {
		// Undefined causes problems by outputting dates full of NaNs
		return time === undefined ? undefined : _formatTimeISO(time);
	};

	const addTime = curry$1(function(time1, time2) {
		return parseTime(time2) + parseTimeDiff(time1);
	});

	const subTime = curry$1(function(time1, time2) {
		return parseTime(time2) - parseTimeDiff(time1);
	});

	const diffTime = curry$1(function(time1, time2) {
		return parseTime(time1) - parseTime(time2);
	});

	const floorTime = curry$1(function(token, time) {
		return _floorTime(token, parseTime(time));
	});

	function not(a) { return !a; }const toFloat = parseFloat;
	const and     = curry$1(function and(a, b) { return !!(a && b); });
	const or      = curry$1(function or(a, b) { return a || b; });
	const xor     = curry$1(function or(a, b) { return (a || b) && (!!a !== !!b); });

	const assign$3      = curry$1(Object.assign, true, 2);
	const contains$1    = curry$1(contains, true);
	const define      = curry$1(Object.defineProperties, true, 2);
	const equals$1      = curry$1(equals, true);
	const get$1         = curry$1(get, true);
	const is          = curry$1(_is, true);
	const invoke$1      = curry$1(invoke, true);
	const nth$1         = curry$1(nth);
	const parse       = curry$1(_parse);
	const remove$2      = curry$1(remove$1, true);
	const rest$1        = curry$1(rest, true);
	const set$1         = curry$1(set, true);
	const toFixed$1     = curry$1(toFixed);
	const getPath$1     = curry$1(getPath, true);
	const setPath$1     = curry$1(setPath, true);
	const append$1      = curry$1(append, true);
	const prepend$2     = curry$1(prepend$1);
	const add$1         = curry$1(add);
	const multiply$1    = curry$1(multiply);
	const min$1         = curry$1(min);
	const max$1         = curry$1(max);
	const mod$1         = curry$1(mod);
	const pow$1         = curry$1(pow);
	const exp$1         = curry$1(exp);
	const log$1         = curry$1(log);
	const root$1        = curry$1(root);
	const limit$1       = curry$1(limit);
	const normalise$1   = curry$1(normalise);
	const denormalise$1 = curry$1(denormalise);


	/*
	export const sum       = Fn.add;
	export const flip      = Fn.flip;
	export const throttle  = Fn.Throttle;
	export const wait      = Fn.Wait;
	export const update    = Fn.update;

	export const limit       = Fn.limit;
	export const pow         = Fn.pow;
	export const toCartesian = Fn.toCartesian;
	export const toPolar     = Fn.toPolar;
	export const Stream      = window.Stream;
	*/

	exports.curry = curry$1;
	exports.not = not;
	exports.toFloat = toFloat;
	exports.and = and;
	exports.or = or;
	exports.xor = xor;
	exports.assign = assign$3;
	exports.contains = contains$1;
	exports.define = define;
	exports.equals = equals$1;
	exports.get = get$1;
	exports.is = is;
	exports.invoke = invoke$1;
	exports.nth = nth$1;
	exports.parse = parse;
	exports.remove = remove$2;
	exports.rest = rest$1;
	exports.set = set$1;
	exports.toFixed = toFixed$1;
	exports.getPath = getPath$1;
	exports.setPath = setPath$1;
	exports.append = append$1;
	exports.prepend = prepend$2;
	exports.add = add$1;
	exports.multiply = multiply$1;
	exports.min = min$1;
	exports.max = max$1;
	exports.mod = mod$1;
	exports.pow = pow$1;
	exports.exp = exp$1;
	exports.log = log$1;
	exports.root = root$1;
	exports.limit = limit$1;
	exports.normalise = normalise$1;
	exports.denormalise = denormalise$1;
	exports.args = args;
	exports.cache = cache;
	exports.choke = choke;
	exports.choose = choose;
	exports.compose = compose;
	exports.deprecate = deprecate;
	exports.id = id;
	exports.isDefined = isDefined;
	exports.last = last;
	exports.latest = latest;
	exports.noop = noop$1;
	exports.nothing = nothing$1;
	exports.now = now;
	exports.once = once$1;
	exports.overload = overload;
	exports.pipe = pipe;
	exports.requestTick = requestTick;
	exports.self = self;
	exports.toArray = toArray$1;
	exports.toClass = toClass;
	exports.toInt = toInt;
	exports.toString = toString;
	exports.toType = toType;
	exports.weakCache = weakCache;
	exports.Functor = Fn$1;
	exports.Observable = observable;
	exports.Stream = Stream$1;
	exports.Timer = Timer;
	exports.Pool = Pool;
	exports.slugify = slugify;
	exports.todB = todB;
	exports.toLevel = toLevel;
	exports.toRad = toRad;
	exports.toDeg = toDeg;
	exports.nowDate = nowDate;
	exports.dateDiff = dateDiff;
	exports.toTimestamp = toTimestamp;
	exports.addDate = addDate;
	exports.diffDateDays = diffDateDays;
	exports.floorDate = floorDate;
	exports.formatDate = formatDate;
	exports.cloneDate = cloneDate;
	exports.formatDateISO = formatDateISO;
	exports.formatDateTimeISO = formatDateTimeISO;
	exports.formatDateLocal = formatDateLocal;
	exports.parseDate = parseDate;
	exports.parseDateLocal = parseDateLocal;
	exports.toDay = toDay;
	exports.nowTime = nowTime;
	exports.formatTime = formatTime;
	exports.formatTimeISO = formatTimeISO;
	exports.addTime = addTime;
	exports.subTime = subTime;
	exports.diffTime = diffTime;
	exports.floorTime = floorTime;
	exports.parseTime = parseTime;
	exports.secondsToMilliseconds = secondsToMilliseconds;
	exports.secondsToMinutes = secondsToMinutes;
	exports.secondsToHours = secondsToHours;
	exports.secondsToDays = secondsToDays;
	exports.secondsToWeeks = secondsToWeeks;
	exports.millisecondsToSeconds = millisecondsToSeconds;
	exports.minutesToSeconds = minutesToSeconds;
	exports.hoursToSeconds = hoursToSeconds;
	exports.daysToSeconds = daysToSeconds;
	exports.weeksToSeconds = weeksToSeconds;

	return exports;

}({}));
