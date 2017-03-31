
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

function group(name, fn) {
	console.group('%c' + name, 'color: #666666; font-weight: 300;');
	fn(test);
	console.groupEnd();
}

function test(name, fn) {
	console.group('%c' + name, 'color: #666666; font-weight: 300;');
	fn();
	console.groupEnd();
}
