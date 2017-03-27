
function flush(fn) {
	var value = this.shift();
	while (value !== undefined) {
		fn(value);
		value = this.shift();
	}
}

function Stream(setup) {
	var source = this;

	var shift = function() {
		var buffer = setup(function(type) {
			notify(type, source);
		});
		
		shift = function() {
			return buffer.shift();
		};

		return shift();
	};

	this.shift = function() {
		return shift();
	};

	this.push = function() {
		return shift();
	};
}



Stream.Buffer = function(array) {
	return new Stream(function setup(notify) {
		return Array.from(array);
	});
};

Stream.Merge = function() {
	var sources = arguments;

	return new Stream(function setup(notify) {
		var buffer = [];

		function push(value) {
			buffer.push(value);
			notify('push');
		}

		Array
		.from(sources)
		.forEach(function(source) {
			// Flush the source
			flush(push, source);

			// Listen for incoming values and buffer them into stream
			source.on('push', function() {
				flush(push, source);
			});
		});

		return buffer;
	});
};

Stream.Events = function(type, node) {
	return new Stream(function setup(notify) {
		var buffer = [];

		function push(value) {
			buffer.push(value);
			notify('push');
		}

		node.addEventListener(type, push);

		return {
			shift: function() {
				return buffer.shift();
			},

			stop: function stop() {
				node.removeEventListener(type, control.push);
			}
		};
	});
};


Stream.Choke = function() {
	return new Stream(function setup() {
		var buffer  = [];

		return {
			shift: function() {
				return buffer.shift();
			},

			push: Wait(function push() {
				// Get last value and stick it in buffer
				buffer[0] = arguments[arguments.length - 1];
				this.notify('push');
			}, time)
		};
	});
};
