(function(window) {
	"use strict";
	
	var assign = Object.assign;
	var Fn     = window.Fn;
	var Stream = Fn.Stream;
	var debug  = true;

	// Methods mixin for newly created store objects
	var methods = {
		modify: (function(action) {
			var action = {};

			// Take a string type and some data, update and push an action
			// object. Watch out: if we ever introduce asynchronicity into the
			// stream of actions we will have to use a proper object pool.
			return function modify(type, data) {
				action.type = type;
				action.data = data;
				return this.push(action);
			};
		})()
	};

	function actionsReducer(actions) {
		return function(data, action) {
			return actions[action.type] ?
				// For known actions, return modified data
				actions[action.type](data, action.data) :
				// For unknown actions, return the current state
				data ;
		};
	}

	function reducersReducer(reducers) {
		var keys = Object.keys(reducers);

		if (debug) {
			var isFunctions = Fn(keys)
			.map(function(key) { return reducers[key]; })
			.each(function(fn) {
				if (typeof fn === "function") { return; }
				throw new TypeError('Reducer is not a function');
			});
		}

		// Return a new reducer - mutable version

		return function reducer(data, action) {
			// To make this reducer immutable, set next to empty object {}.
			var n = keys.length;
			var key, fn, state;

			while (n--) {
				// Update data with new state
				key   = keys[n];
				fn    = reducers[key];
				fn(data[key], action);
			}

			return data;
		};

		// Return a new reducer - immutable version

		//return function reducer(data, action) {
		//	var next = {};
		//	var n = keys.length;
		//	var key, fn, state;
		//
		//	while (n--) {
		//		// Get new state
		//		key   = keys[n];
		//		fn    = reducers[key];
		//		state = fn(data[key], action);
		//
		//		// If new state has changed since old state set it on next
		//		if (state !== data[key]) {
		//			next[key] = state;
		//		}
		//	}
		//
		//	return next;
		//};
	}

	function Store(reducer, data) {
		return assign(Stream.of(), methods).scan(reducer, data);
	}

	window.Store          = Store;
	Store.actionsReducer  = actionsReducer;
	Store.reducersReducer = reducersReducer;
})(this);
