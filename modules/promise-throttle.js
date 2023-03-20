export default function Throttle(fn) {
	var promise, context, args;

	function fire() {
		// Remove promise
		promise = undefined;

		// Make the function
		return fn.apply(context, args);
	}

	return function throttle() {
		// Throttle requests to next tick, using the context and args
		// from the latest call to request()
		promise = promise || Promise.resolve().then(fire);
		context = this;
		args    = arguments;

		return promise;
	};
}
