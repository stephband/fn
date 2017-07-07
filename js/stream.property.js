(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Observable = window.Observable;

	var observe    = Observable.observe;
	var last       = Fn.last;

	Stream.Observe = function(path, object) {
		var observable = Observable(object);

		return new Stream(function setup(notify) {
			var value;

			function update(val) {
				value = val;
				notify('push');
			}

			observe(observable, path, update);

			if (object[name] !== undefined) { notify('push'); }

			return {
				shift: function() {
					var v = value;
					value = undefined;
					return v;
				},

				push: function() {
					object[name] = arguments[arguments.length - 1];
				},

				stop: function() {
					unobserve(object, name, update);
					notify('stop');
				}
			};
		});
	};
})(this);
