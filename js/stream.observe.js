(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Observable = window.Observable;

	var observe    = Observable.observe;
	var setPath    = Fn.setPath;

	Stream.Observe = function(path, object) {
		var observable = Observable(object);

		return new Stream(function setup(notify) {
			var value;

			function update(v) {
				value = v;
				notify('push');
			}

			var unobserve = observe(observable, path, update);

			return {
				shift: function() {
					var v = value;
					value = undefined;
					return v;
				},

				push: function() {
					setPath(path, observable, arguments[arguments.length - 1]);
				},

				stop: function() {
					unobserve();
					notify('stop');
				}
			};
		});
	};
})(this);
