
import { equals } from './equals.js';

const tests = [];
let running = false;

function assert(expected, value, name, message) {
	if (!equals(value, expected)) {
		var string = '✘ ' + name + ' failed\n  '
			+ 'Expected: ' + (typeof expected === 'object' ? JSON.stringify(expected) : expected) + ', '
			+ 'received: ' + (typeof value    === 'object' ? JSON.stringify(value)    : value)
			+ ( message ? '\n  ' + message : '') ;

		console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
		return false;
	}

	return true;
}

function expectDone(expected, value, name) {
	var string = '✘ ' + name + ' failed\n  '
		+ 'Assertion after test stopped with done()' ;

	console.log('%c' + string, 'color: #ee8833; font-weight: 300;');
}

function run(name, expected, fn, next) {
	const n    = expected.length;
	let m      = 0;
	let pass   = true;

	let expect = (value, message) => {
		if (!expected.length) {
			var string = '✘ ' + name + ' failed\n  '
				+ 'Expected ' + n + ' assertions, '
				+ 'received ' + (n + (++m)) + ': '
				+ value ;

			console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
			pass = false;
		}
		else {
			pass = pass && assert(expected.shift(), value, name, message);
		}
	};

	fn(expect, function done() {
		if (pass && expected.length) {
			var string = '✘ ' + name + ' failed\n  '
				+ 'Expected ' + n + ' assertions, '
				+ 'received ' + (n - expected.length) ;

			console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
			pass = false;
		}

		if (pass) {
			console.log('%c✔%c %s', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', name);
		}

		expect = expectDone;
		next();
	});
}

function next() {
	var args = tests.shift();

	if (!args) {
		running = false;
		return;
	}

	running = true;
	run(args.name, args.expected, args.fn, next);
}

export default function test(name, expected, fn) {
	tests.push({ name, expected, fn });

	if (!running) {
		next();
	}
}
