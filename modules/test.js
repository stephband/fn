
import { equals } from './equals.js';

const tests  = [];
const stops  = [];
const totals = { pass: 0, fail: 0 };
let running = false;

function assert(expected, value, name, message) {
	if (!equals(value, expected)) {
		var string = '✘ ' + name + '\n  '
			+ 'expected: ' + (typeof expected === 'object' ? JSON.stringify(expected) : expected) + ', '
			+ 'received: ' + (typeof value    === 'object' ? JSON.stringify(value)    : value)
			+ ( message ? '\n  ' + message : '') ;

		console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
		return false;
	}
	//else {
	//	console.log('%c✔%c pass', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', value);
	//}

	return true;
}

function expectDone(expected, value, name) {
	var string = '✘ ' + name + '\n  '
		+ 'Assertion after test stopped with done()' ;

	--totals.pass;
	++totals.fail;

	// expect() called after done() message
	console.log('%c' + string, 'color: #ee8833; font-weight: 300;');
}

function run(name, expected, fn, next) {
	const n      = expected.length;
	const passed = [];
	let m      = 0;
	let pass   = true;

	let expect = (value, message) => {
		if (!expected.length) {
			var string = '✘ ' + name + '\n  '
				+ 'expected ' + n + ' assertions, '
				+ 'received ' + (n + (++m)) + ': '
				+ value ;

			console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
			pass = false;
		}
		else {
			const e = expected.shift();
			const p = assert(e, value, name + ' (assertion ' + (n - expected.length) + ')', message);
			if (p) { passed.push(value); }
			pass = pass && p;
		}
	};

	Promise
	.resolve()
	.then(() => {
		console.group('%c' + name, 'color: #aaaaaa; font-weight: 300;', passed);
		//console.log('%c✔%c Tested', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', passed);
		fn(expect, function done() {
			if (pass && expected.length) {
				var string = '✘ ' + name + '\n  '
					+ 'expected ' + n + ' assertions, '
					+ 'received ' + (n - expected.length) ;

				console.trace('%c' + string, 'color: #ee8833; font-weight: 300;');
				pass = false;
			}

			if (pass) {
				++totals.pass;
				// Final PASS message
				console.log('%c✔%c %s', 'color: #b4d094;', 'color: #6f9940; font-weight: 300;', 'Tests passed'/*name*/);
			}
			else {
				++totals.fail;
			}

			expect = expectDone;
			console.groupEnd();
			next();
		});
	})
	.catch((error) => {
		console.groupEnd();
		console.error(error);
		next();
	});
}

function next() {
	var args = tests.shift();

	if (!args) {
		running = false;
		stops.forEach((fn) => fn(totals));
		return;
	}

	running = true;
	run(args.name, args.expected, args.fn, next);
}

/**
test(name, expected, fn)
A small test function designed to run in the browser.

```js
test('Example test', [1], (expect, done) => {
	// Test a value against expected values
	expect(1);
	// Signal that test is done
	done();
});
```
**/

export default function test(name, expected, fn) {
	tests.push({ name, expected, fn });
	if (!running) { next(); }
}

/**
done(fn)
Register a callback function that is fired when all tests are complete.

```js
done((totals) => console.log('Pass', totals.pass, 'Fail', totals.fail);
```
**/

export function done(fn) {
	// Dodgy dodgy logic
	if (!running) { fn(totals); }
	else { stops.push(fn); }
}
