
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

new Benchmark.Suite()
.add('   {}', function() {
	const a = {};
})
.add('   new Object()', function() {
	const a = new Object();
})
.add('   new Proxy({}, traps)', function() {
	const a = new Proxy({}, traps);
})
.add('   Observer()', function() {
	const b = Observer();
})
.add('   Observer({})', function() {
	const b = Observer({});
})
.add('   Observer({ a: 1, b: [] })', function() {
	const b = Observer({ a: 1, b: [] });
})
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run();

const a = {};
const b = Observer({});
const c = { c1: { c2: {}}};
const d = Observer({ d1: { d2: {}}});

new Benchmark.Suite()
.add('   set {}', function() {
	a.a1 = 'hello';
})
.add('   set Observer({})', function() {
	b.b1 = 'hello';
})
.add('   set {c1:{c2:{}}}', function() {
	c.c1.c2.c3 = 'hello';
})
.add('   set Observer({d1:{d2:{}}})', function() {
	d.d1.d2.d3 = 'hello';
})
.add('   get {}', function() {
	const x = a.a1;
})
.add('   get Observer({})', function() {
	const x = b.b1;
})
.add('   get {c1:{c2:{}}}', function() {
	const x = c.c1.c2.c3;
})
.add('   get Observer({d1:{d2:{}}})', function() {
	const x = d.d1.d2.d3;
})
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run();
