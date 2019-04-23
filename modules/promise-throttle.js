export function PromiseThrottle(fn) {
	var promise, context, args;

	function fire() {
		// Remove promise
		promise = undefined;

		// Make the function
		return fn.apply(context, args);
	}

	return function request() {
		// Throttle requests to next tick, usin the context and args
		// from the latest call to request()
		promise = promise || Promise.resolve().then(fire);
		context = this;
		args    = arguments;

		return promise;
	};
}
