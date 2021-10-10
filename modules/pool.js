
import noop from './noop.js';

function call(fn) {
	return fn();
}

// Just for debugging
var loggers = [];

// Pool
export default function Pool(options, prototype) {
	var create = options.create || noop;
	var reset  = options.reset  || noop;
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
	return Array.from(loggers).map(call).toJSON();
};
