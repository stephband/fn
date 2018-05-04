(function(window) {
	if (!window.console || !window.console.log) { return; }
	window.console.log('Fn          - https://github.com/stephband/fn');
})(window);

(function(window) {
	"use strict";

	var DEBUG = window.DEBUG === true;


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;
	var assign = Object.assign;


	// Constant for converting radians to degrees
	var angleFactor = 180 / Math.PI;





	// Debug helpers





	function debug() {
		if (!window.console) { return fn; }

		var fn   = arguments[arguments.length - 1];
		var logs = A.slice.call(arguments, 0, arguments.length - 1);

		logs.push((fn.name || 'function') + '(');

		return function() {
			logs.push.apply(logs, arguments);
			logs.push(')');
			console.group.apply(console, logs);
			var value = fn.apply(this, arguments);
			console.groupEnd();
			console.log('⬅', value);
			return value;
		};
	}


	// Functional functions

	function bind(args, fn) {
		return function() {
			fn.apply(this, concat(arguments, args));
		};
	}

	function applyFn(fn, args) {
		return typeof fn === 'function' ? fn.apply(null, args) : fn ;
	}

	function flip(fn) {
		return function(a, b) {
			return fn(b, a);
		};
	}




	// Types

	var regex = {
		//         / (  (  (  (   http:         ) //  ) domain          /path   )(more /path  ) /   (path/      ) chars  )(hash or query string      )  /
		url:       /^(?:(?:(?:(?:[fht]{1,2}tps?:)?\/\/)?[-\w]+\.[-\w]+|\/[-\w.]+)(?:\/?[-\w.]+)*\/?|(?:[-\w.]+\/)+[-\w.]*)(?:[#?][#?!\[\]$\,;&=-\w.]*)?$/,
		email:     /^((([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^[+-]?(?:\d*\.)?\d+$/,
		int:       /^(-?\d+)$/
	};







	function isNot(a, b) { return a !== b; }






	// Arrays

	function sortedSplice(array, fn, value) {
		// Splices value into array at position determined by result of fn,
		// where result is either in the range [-1, 0, 1] or [true, false]
		var n = sortIndex(array, function(n) {
			return fn(value, n);
		});
		array.splice(n, 0, value);
	}

	function sortIndex(array, fn) {
		var l = array.length;
		var n = l + l % 2;
		var i = 0;

		while ((n = Math.floor(n / 2)) && (i + n <= l)) {
			if (fn(array[i + n - 1]) >= 0) {
				i += n;
				n += n % 2;
			}
		}

		return i;
	}

	//function sparseShift(array) {
	//	// Shift values ignoring undefined holes
	//	var value;
	//	while (array.length) {
	//		value = A.shift.apply(array);
	//		if (value !== undefined) { return value; }
	//	}
	//}

	function uniqueReducer(array, value) {
		if (array.indexOf(value) === -1) { array.push(value); }
		return array;
	}

	function arrayReducer(array, value) {
		array.push(value);
		return array;
	}

	//function whileArray(fn, array) {
	//	var values = [];
	//	var n = -1;
	//	while (++n < array.length && fn(array[n])) {
	//		values.push(object[n]);
	//	}
	//	return values;
	//}

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}

	function concat(array2, array1) {
		// A.concat only works with arrays - it does not flatten array-like
		// objects. We need a robust concat that will glue any old thing
		// together.
		return Array.isArray(array1) ?
			// 1 is an array. Convert 2 to an array if necessary
			array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

		array1.concat ?
			// It has it's own concat method. Lets assume it's robust
			array1.concat(array2) :
		// 1 is not an array, but 2 is
		toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
	}



	var isIn = flip(contains);

	function map(fn, object) {
		return object && object.map ? object.map(fn) : A.map.call(object, fn) ;
	}



	function filter(fn, object) {
		return object.filter ?
			object.filter(fn) :
			A.filter.call(object, fn) ;
	}

	function reduce(fn, seed, object) {
		return object.reduce ?
			object.reduce(fn, seed) :
			A.reduce.call(object, fn, seed);
	}

	function rest(i, object) {
		if (object.slice) { return object.slice(i); }
		if (object.rest)  { return object.rest(i); }

		var a = [];
		var n = object.length - i;
		while (n--) { a[n] = object[n + i]; }
		return a;
	}

	function slice(n, m, object) {
		return object.slice ? object.slice(n, m) : A.slice.call(object, n, m);
	}

	function take(i, object) {
		if (object.slice) { return object.slice(0, i); }
		if (object.take)  { return object.take(i); }

		var a = [];
		var n = i;
		while (n--) { a[n] = object[n]; }
		return a;
	}

	function find(fn, object) {
		return A.find.call(object, fn);
	}

	function insert(fn, array, object) {
		var n = -1;
		var l = array.length;
		var value = fn(object);
		while(++n < l && fn(array[n]) <= value);
		array.splice(n, 0, object);
	}

	function update(fn, target, array) {
		return array.reduce(function(target, obj2) {
			var obj1 = target.find(compose(Fn.is(fn(obj2)), fn));
			if (obj1) {
				assign(obj1, obj2);
			}
			else {
				insert(fn, target, obj2);
			}
			return target;
		}, target);
	}

	function remove(array, value) {
		if (array.remove) { array.remove(value); }
		var i = array.indexOf(value);
		if (i !== -1) { array.splice(i, 1); }
	}

	function split(fn, object) {
		if (object.split && typeof object !== 'string') { return object.split(fn); }

		var array = [];
		var n     = -1;
		var value;

		while((value = object[++n]) !== undefined) {
			if (fn(value) || n === 0) { array.push([value]); }
			else { array[array.length].push(value); }
		}

		return array;
	}

	function diff(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return true; }
			values.splice(i, 1);
			return false;
		}, object)
		.concat(values);
	}

	function intersect(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return false; }
			values.splice(i, 1);
			return true;
		}, object);
	}

	function unite(array, object) {
		var values = toArray(array);

		return map(function(value) {
			var i = values.indexOf(value);
			if (i > -1) { values.splice(i, 1); }
			return value;
		}, object)
		.concat(values);
	}

	function unique(object) {
		return object.unique ?
			object.unique() :
			reduce(uniqueReducer, [], object) ;
	}

	function sort(fn, object) {
		return object.sort ? object.sort(fn) : A.sort.call(object, fn);
	}

	var tap = curry(function tap(fn, object) {
		return object === undefined ? undefined : (fn(object), object) ;
	}, true);


	// Numbers

	function gcd(a, b) {
		// Greatest common divider
		return b ? gcd(b, a % b) : a ;
	}

	function lcm(a, b) {
		// Lowest common multiple.
		return a * b / gcd(a, b);
	}

	function sampleCubicBezier(a, b, c, t) {
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
		return ((a * t + b) * t + c) * t;
	}

	function sampleCubicBezierDerivative(a, b, c, t) {
		return (3 * a * t + 2 * b) * t + c;
	}

	function solveCubicBezierX(a, b, c, x, epsilon) {
		// Solve x for a cubic bezier
		var x2, d2, i;
		var t2 = x;

		// First try a few iterations of Newton's method -- normally very fast.
		for(i = 0; i < 8; i++) {
			x2 = sampleCubicBezier(a, b, c, t2) - x;
			if (Math.abs(x2) < epsilon) {
				return t2;
			}
			d2 = sampleCubicBezierDerivative(a, b, c, t2);
			if (Math.abs(d2) < 1e-6) {
				break;
			}
			t2 = t2 - x2 / d2;
		}

		// Fall back to the bisection method for reliability.
		var t0 = 0;
		var t1 = 1;

		t2 = x;

		if(t2 < t0) { return t0; }
		if(t2 > t1) { return t1; }

		while(t0 < t1) {
			x2 = sampleCubicBezier(a, b, c, t2);
			if(Math.abs(x2 - x) < epsilon) {
				return t2;
			}
			if (x > x2) { t0 = t2; }
			else { t1 = t2; }
			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	}


	// Time

	var requestFrame = window.requestAnimationFrame;





	// Throttle
	//
	// Returns a function that calls `fn` once on the next timer frame, using
	// the context and arguments from the latest invocation.

	function Throttle(fn, request, cancel) {
		request = request || window.requestAnimationFrame;
		cancel  = cancel  || window.cancelAnimationFrame;

		var queue = schedule;
		var context, args, id;

		function schedule() {
			queue = noop;
			id = request(update);
		}

		function update() {
			queue = schedule;
			fn.apply(context, args);
		}

		function stop(callLast) {
			// If there is an update queued apply it now
			//if (callLast !== false && queue === noop) { update(); }

			// An update is queued
			if (queue === noop && id !== undefined) {
				cancel(id);
			}

			// Don't permit further changes to be queued
			queue = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args    = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = stop;
		return throttle;
	}



	// Fn


	// Export

	window.Fn = assign(Fn, {

		// Functions


		flip:      flip,

		//pipe:      pipe,
		//choke:     choke,
		throttle:  Throttle,

		// Logic

		equals:    curry(equals),
		is:        curry(is),
		isDefined: isDefined,
		isIn:      curry(isIn, true),
		isNot:     curry(isNot),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),

		by: curry(function by(fn, a, b) {
			return byGreater(fn(a), fn(b));
		}, true),

		byGreater: curry(byGreater),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),


		// Types

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its content.
				var n = types.length;

				// Test regexable string types
				while (n--) {
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
		})(regex, ['url', 'date', 'email', 'float', 'int']),


		// Collections

		concat:    curry(concat, true),
		diff:      curry(diff, true),
		filter:    curry(filter, true),
		find:      curry(find, true),
		insert:    curry(insert, true),
		intersect: curry(intersect, true),
		last:      last,
		//latest:    latest,
		map:       curry(map, true),
		tap:       curry(tap),
		reduce:    curry(reduce, true),
		remove:    curry(remove, true),
		//rest:      curry(rest, true),
		sort:      curry(sort, true),
		split:     curry(split, true),
		take:      curry(take, true),
		unite:     curry(unite, true),
		unique:    unique,
		update:    curry(update, true),


		// Numbers

		gcd:      curry(gcd),
		lcm:      curry(lcm),


		factorise: function factorise(n, d) {
			// Reduce a fraction by finding the Greatest Common Divisor and
			// dividing by it.
			var f = gcd(n, d);
			return [n/f, d/f];
		},

		gaussian: function gaussian() {
			// Returns a random number with a bell curve probability centred
			// around 0 and limits -1 to 1.
			return Math.random() + Math.random() - 1;
		},

		toPolar: function toPolar(cartesian) {
			var x = cartesian[0];
			var y = cartesian[1];

			return [
				// Distance
				x === 0 ?
					Math.abs(y) :
				y === 0 ?
					Math.abs(x) :
					Math.sqrt(x*x + y*y) ,
				// Angle
				Math.atan2(x, y)
			];
		},

		toCartesian: function toCartesian(polar) {
			var d = polar[0];
			var a = polar[1];

			return [
				Math.sin(a) * d ,
				Math.cos(a) * d
			];
		},

		wrap:     curry(function wrap(min, max, n) { return (n < min ? max : min) + (n - min) % (max - min); }),

		rangeLog:    curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(n / min) / Math.log(max / min));
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),


		// Cubic bezier function (originally translated from
		// webkit source by Christian Effenberger):
		// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

		cubicBezier: curry(function cubicBezier(p1, p2, duration, x) {
			// The epsilon value to pass given that the animation is going
			// to run over duruation seconds. The longer the animation, the
			// more precision is needed in the timing function result to
			// avoid ugly discontinuities.
			var epsilon = 1 / (200 * duration);

			// Calculate the polynomial coefficients. Implicit first and last
			// control points are (0,0) and (1,1).
			var cx = 3 * p1[0];
			var bx = 3 * (p2[0] - p1[0]) - cx;
			var ax = 1 - cx - bx;
			var cy = 3 * p1[1];
			var by = 3 * (p2[1] - p1[1]) - cy;
			var ay = 1 - cy - by;

			var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
			return sampleCubicBezier(ay, by, cy, y);
		}),

		// Exponential functions
		//
		// e - exponent
		// x - range 0-1
		//
		// eg.
		// var easeInQuad   = exponential(2);
		// var easeOutCubic = exponentialOut(3);
		// var easeOutQuart = exponentialOut(4);

		exponentialOut: curry(function exponentialOut(e, x) {
			return 1 - Math.pow(1 - x, e);
		}),

		// Strings

		match:       curry(function match(regex, string) { return regex.test(string); }),
		exec:        curry(function parse(regex, string) { return regex.exec(string) || undefined; }),
		replace:     curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),


		// Regexp

		rspaces: /\s+/,


		// Time

		requestFrame: requestFrame,


		// Debugging

		debug:        debug,


		// Deprecated

		bind:     deprecate(bind, 'Review bind: it doesnt do what you think'),
		dB:       deprecate(noop, 'dB() is now todB()'),
		degToRad: deprecate(noop, 'degToRad() is now toRad()'),
		radToDeg: deprecate(noop, 'radToDeg() is now toDeg()'),

		nthRoot:  curry(
			deprecate(function nthRoot(n, x) { return Math.pow(x, 1/n); },
			'nthRoot(n, x) is now simply root(n, x)'), false, 2),

		Throttle: deprecate(Throttle, 'Throttle(fn, time) removed, is now throttle(fn, time)'),
		Wait: deprecate(Wait, 'Wait(fn, time) removed, is now wait(fn, time)'),

		slice: curry(slice, true, 3),

		returnThis: deprecate(self, 'returnThis() is now self()'),

		run: curry(deprecate(function apply(values, fn) {
			return fn.apply(null, values);
		}, 'run() is now apply()'), true, 2),

		overloadLength: curry(deprecate(overload, 'overloadLength(map) is now overload(fn, map)'), true, 2)(function() {
			return arguments.length;
		}),

		overloadTypes: curry(deprecate(overload, 'overloadTypes(map) is now overload(fn, map)'), true, 2)(function() {
			return A.map.call(arguments, toType).join(' ');
		})
	});

	Object.defineProperties(Fn, {
		empty: {
			get: deprecate(
				function() { return nothing; },
				'Fn.empty is now Fn.nothing'
			)
		}
	});
})(window);
