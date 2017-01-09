(function(window) {
	"use strict";
	
	var Fn = window.Fn;
	var Stream = Fn.Stream;

	Stream.observe = function(name, object) {
		var stream = Stream.of();

		// AudioParams objects must be polled, as they cannot be reconfigured
		// to getters/setters, nor can they be Object.observed. And they fail
		// to do both of those completely silently. So we test the scope to see
		// if it is an AudioParam and set the observe and unobserve functions
		// to poll.
		//if (isAudioParam(object)) {
		//	return poll(object, property, fn);
		//}

		//var descriptor;
		//
		//if (property === 'length') {
		//	// Observe length and update the DOM on next animation frame if
		//	// it changes.
		//	descriptor = Object.getOwnPropertyDescriptor(object, property);
		//
		//	if (!descriptor.get && !descriptor.configurable) {
		//		console.warn && console.warn('Fn: Are you trying to observe an array? Fn is going to observe it by polling.', object, object instanceof Array);
		//		console.trace && console.trace();
		//		return poll(object, property, fn);
		//	}
		//}

		function update() {
			stream.push(object[name]);
		}

		stream.stop = function() {
			unobserve(object, name, update);
			stream.status = "done";
		};

		observe(object, name, update);
		update();
		return stream;
	};
})(this);
