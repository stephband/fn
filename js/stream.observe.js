(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Observable = window.Observable;

	// Dont import it yet - we may be about to overwrite it with our back-fill
	// for browsers without Proxy.
	//var Observable = window.Observable;
	//var observe    = Observable.observe;

	var curry      = Fn.curry;
	var noop       = Fn.noop;
	var setPath    = Fn.setPath;

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

		unobserve: noop
	};

	Stream.observe = curry(function(path, object) {
		return new Stream(function setup(notify, stop) {
			var source = new ObserveSource(stop, object, path);

			function update(v) {
				source.value = v === undefined ? null : v ;
				notify('push');
			}

			source.unobserve = Observable.observe(object, path, update);
			return source;
		});
	});
})(window);
