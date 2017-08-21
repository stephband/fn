(function(window) {
	"use strict";

	var $events = Symbol('events');

	var mixin = {
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
	};

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

	window.events = {
		notify: notify,
		mixin:  mixin
	});
})(this);