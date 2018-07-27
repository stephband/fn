

(function(window) {
	"use strict";

	var DEBUG = window.DEBUG === true;


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;
	var assign = Object.assign;





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

	function flip(fn) {
		return function(a, b) {
			return fn(b, a);
		};
	}




	// Types









	function isNot(a, b) { return a !== b; }





	//function sparseShift(array) {
	//	// Shift values ignoring undefined holes
	//	var value;
	//	while (array.length) {
	//		value = A.shift.apply(array);
	//		if (value !== undefined) { return value; }
	//	}
	//}



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



	var isIn = flip(contains);



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








	// Fn


	// Export

	window.Fn = assign(Fn, {

		// Functions


		flip:      flip,

		// Logic

		isIn:      curry(isIn, true),
		isNot:     curry(isNot),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),
		byGreater: curry(byGreater),






		// Collections

		sort:      curry(sort, true),
		split:     curry(split, true),









		// Debugging

		debug:        debug,


		// Deprecated

		bind:     deprecate(bind, 'Review bind: it doesnt do what you think'),

	});
})(window);
