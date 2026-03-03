
import equals  from './equals.js';
import matches from './matches.js';

const global = globalThis || window;
const tests  = [];
const stops  = [];
const totals = { pass: 0, fail: 0 };

const passStyle = 'color: #6f9940; font-weight: 300;';
const failStyle = 'color: #ee8833; font-weight: 300;';

let running = false;
let count = 0;

function createAssert(fn, name, expected, state) {
    return (value, message) => {
        if (!expected.length) {
            console.trace(`%c✘ ${ name }
expected ${ n } assertions
received ${ n + (++m) }
${ typeof value === 'object' ? JSON.stringify(value) : value }`, failStyle);
            state.pass = false;
            return;
        }

        const expectation = expected.shift();
        const result = fn(expectation, value);

        if (result) {
            passed.push(value);
        }
        else {
            console.trace(`%c✘ ${ name } (assertion ${ n - expected.length })
expected: ${ typeof expectation === 'object' ? JSON.stringify(expectation) : expectation }
received: ${ typeof value === 'object' ? JSON.stringify(value) : value }
${ message || '' }`, failStyle);
        }

        state.pass = state.pass && result;
    };
}

function expectDone(expected, value, name) {
	var string = '✘ ' + name + '\n  '
		+ 'Assertion after test stopped with done()' ;

	--totals.pass;
	++totals.fail;

	// expect() called after done() message
	console.log('%c' + string, failStyle);
}

// Support legacy test(expect, done) and new test({ equals, matches }, done)
expectDone.equals = expectDone;
expectDone.matches = expectDone;

function run(name, expected, fn, next) {
	const n      = expected.length;
	const passed = [];
	let m        = 0;
    const state  = { pass: true };

    // Support legacy test(expect, done) and new test({ equals, matches }, done)
	let expect = createAssert(equals, name, expected, state);
    expect.equals = expect;
    expect.matches = createAssert(matches, name, expected, state);

	Promise
	.resolve()
	.then(() => {
		if (global.DEBUG) {
			console.group(`%c${ ++count } - ${ name }`, 'color: #aaaaaa; font-weight: 300;', passed);
			//console.log('%c✔%c Tested', 'color: #b4d094;', passStyle, passed);
		}

		fn(expect, function done() {
			if (state.pass && expected.length) {
				var string = '✘ ' + name + '\n  '
					+ 'expected ' + n + ' assertions, '
					+ 'received ' + (n - expected.length) ;

				console.trace('%c' + string, failStyle);
				state.pass = false;
			}

			if (state.pass) {
				++totals.pass;
				// Final PASS message
				console.log('%c✔%c %s', 'color: #b4d094;', passStyle, `Passed – ${ passed.length } test${ passed.length === 1 ? '' : 's' } – ${ name }`);
			}
			else {
				++totals.fail;
			}

			expect = expectDone;

			if (global.DEBUG) {
				console.groupEnd();
			}
			else {
				//console.log('%c✔%c ' + name, 'color: #b4d094;', passStyle, passed);
			}

			next();
		});
	})
	.catch((error) => {
		if (global.DEBUG) {
			console.groupEnd();
		}

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
