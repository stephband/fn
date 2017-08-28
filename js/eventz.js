(function(window) {
	"use strict";

	var assign  = Object.assign;
	var $events = Symbol('events');

	function Events() {
		this[$events] = {};
	}

	assign(Events.prototype, {
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

	assign(Events, {
		notify: function notify(type, value, object) {
			var events = object[$events];

			if (!events) { return; }
			
			var listeners = events[type];
			if (!listeners) { return; }

			var n = -1;
			var l = listeners.length;
			var value, fn;

			while (fn = listeners[++n]) {
				fn(value);

				//value = listeners[n](type, object);
				//if (value !== undefined) {
				//	return value;
				//}
			}
		}
	});

	window.Events = Events;

	window.events = {
		notify: Events.notify,
		mixin:  Events.prototype
	};
})(this);