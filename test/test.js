
var log = console.log.bind(console);

function typeWrap(value) {
	var type = typeof value;
	return type === 'string' ? '"' + value + '"' : value ;
}

function equals(expected, value, message) {
	if (value !== expected) {
		console.trace(message ||
			'Test failed: ' + 
			'expected: ' + typeWrap(expected) + ', ' +
			'received: ' + typeWrap(value)
		);
	}
}

function test(name, fn) {
	console.group(name);
	fn();
	console.groupEnd();
}
