(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Observable = window.Observable;

	var observe    = Observable.observe;
	var curry      = Fn.curry;
	var noop       = Fn.noop;
	var setPath    = Fn.setPath;

	function ObserveSource(stop, observable, path) {
		this.observable = observable;
		this.path       = path;
		this.stop       = stop;
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
			this.stop();
		},

		unobserve: noop
	};

	Stream.observe = curry(function(path, object) {
		var observable = Observable(object);

		return new Stream(function setup(notify, stop) {
			var source = new ObserveSource(stop, observable, path);

			function update(v) {
				source.value = v === undefined ? null : v ;
				notify('push');
			}

			source.unobserve = observe(observable, path, update);
			return source;
		});
	});
})(this);
