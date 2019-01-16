
import { Fn, cache, curry, Observer, observe, noop } from '../fn.js';

import "./lodash.js";
import "./platform.js";
import "./benchmark.js";

// Tests

console.log('Set up time');

const traps = {
	get: noop,
	set: noop
};

const a = [2,3,2,3,4,5,78,3];


function uniq(input) {
	const output = [];

	for (let value of input) {
		if (output.indexOf(value) === -1) {
			output.push(value);
		}
	}

	return output;
}

function uniqFilter(input) {
	return input.filter(function(elem, i) {
		return input.indexOf(elem) === i;
	});
}

function uniqRest(input) {
	return [...new Set(a)];
}

function uniqSet(input) {
	return Array.from(new Set(a));
}

new Benchmark.Suite()
.add('   uniq()', function() {
	uniq(a);
})
.add('   uniqFilter()', function() {
	uniqFilter(a);
})
.add('   [...new Set(a)]', function() {
	uniqRest(a);
})
.add('   Array.from(new Set(a))', function() {
	uniqSet(a);
})
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run();
