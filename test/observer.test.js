
import test from "../modules/test/test.js";
import { Observer } from "../modules/observer/observer.js";
import { observe }  from "../modules/observer/observe.js";

test('Observer()', function(test, log) {
	test("observe('', fn, object)", function(equals, done) {
		var expected = [
			{}
		];

		var data = {};
		var o    = Observer(data);

		observe('', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a = 0;
		o.b = 1;
		o.a = undefined;

		equals(expected.length, 0);
		done();
	}, 2);

	test("observe('.', fn, object)", function(equals, done) {
		var expected = [
			{},
			{a: 0},
			{a: 0, b: 1},
			{a: undefined, b: 1},
		];

		var data = {};
		var o    = Observer(data);

		observe('.', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a = 0;
		o.b = 1;
		o.a = undefined;

		equals(expected.length, 0);
		done();
	}, 5);

	test("observe('a', fn, object)", function(equals, done) {
		var expected = [0, undefined];
		var data = {};
		var o    = Observer(data);

		observe('a', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a = 0;
		o.b = 1;
		o.a = undefined;

		equals(expected.length, 0);
		done();
	}, 3);

	test("observe('.', fn, array)", function(equals, done) {
		var expected = [
			[],
			[0],
			[0,1],
			[0,1,2],
			[0],
			[0,1],
			[0,1,2],
			[],
			[0],
			[0,4]
		];

		var lengths = [0, 1, 2, 3, 1, 2, 3, 0, 1, 2];

		var o = Observer([]);

		observe('.', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		observe('length', function(value, change) {
			equals(lengths.shift(), value);
		}, o);

		o[0] = 0;
		o[1] = 1;
		o[2] = 2;
		o.length = 1;
		o[1] = 1;
		o[2] = 2;
		o[1] = 1;
		o.length = 0;
		o.length = 0;
		o[0] = 0;
		o.push(4);

		equals(expected.length, 0);
		done();
	}, 21);

	test("observe('[0]', fn, array)", function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = [];
		var o    = Observer(data);

		observe('[0]', function(value) {
			equals(expected.shift(), value);
		}, o);

		o.push(0);
		o.push(1);
		o.push(2);

		o.length = 0;

		o.push(1);

		o.length = 0;
		o.length = 0;

		o.push(0);

		equals(0, expected.length);
		done();
	}, 6);

	test("observe('a.b.c', fn, object)", function(equals, done) {
		var expected = [1,2,3,4,undefined,5,[6],[7],10,{}];

		var data = {a: {b: {c: 1}}};
		var o    = Observer(data);

		observe('a.b.c', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a.b.c = 2;
		o.a.b = {c: 3};
		o.a = {b: {c: 4}};
		o.a.b.c = undefined;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = {};
		o.a.b.c = 5;
		o.a.b.c = [6];
		o.a.b.c = [7];
		o.a.b.c[0] = 8;
		o.a.b.c[1] = 9;
		o.a.b.c = 10;
		o.a.b.c = {};
		o.a.b.c.d = 11;

		equals(expected.length, 0);
		done();
	}, 11);

	test("observe('a.b.c.', fn, object)", function(equals, done) {
		var expected = [1,2,3,4,undefined,5,[6],[7],[8],[8,9],10,{},{d:11}];

		var data = {a: {b: {c: 1}}};
		var o    = Observer(data);

		observe('a.b.c.', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a.b.c = 2;
		o.a.b = {c: 3};
		o.a = {b: {c: 4}};
		o.a.b.c = undefined;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = {};
		o.a.b.c = 5;
		o.a.b.c = [6];
		o.a.b.c = [7];
		o.a.b.c[0] = 8;
		o.a.b.c[1] = 9;
		o.a.b.c = 10;
		o.a.b.c = {};
		o.a.b.c.d = 11;

		equals(0, expected.length);
		done();
	}, 14);

	test("observe('a.b[d=4,e=\"4\"]', fn, object)", function(equals, done) {
		var expected = [
			{d:4,e:"4",n:1},
			{d:4,e:"4",n:2},
			undefined,
			{d:4,e:"4",n:3},
			undefined,
			{d:4,e:"4",n:4},
			undefined
		];

		var data = {a: {b: [{d: 4, e: "4", n: 1}]}};
		var o    = Observer(data);

		observe('a.b[d=4,e="4"]', function(value) {
			equals(expected.shift(), value);
		}, o);

		o.a = {b: [{d: 4, e: "4", n: 2}]}; // {"d":4,"n":2}
		o.a.b.length = 0;          // undefined
		o.a.b = undefined;
		o.a.b = [{d: 4, e: "4", n: 3}];    // {"d":4,"n":3}
		o.a = undefined;           // undefined
		o.a = {};
		o.a.b = [];
		o.a.b.push({d: 9});

		var object = {d: 4, e: "4", n: 4};
		o.a.b.push(object);        // {"d":4,"n":4}

		//  Mutations to the object not supported. Requires too many bindings,
		//  array and all its objects.
		object.n = 5;              // {"d":4,"n":5}
		object.n = undefined;      // {"d":4,"n":undefined}
		object.d = 5;              // undefined

		// Reset
		object.n = 4;
		object.d = 4;

		o.a.b.unshift({d: 4});
		o.a.b.push({e: "4"});
		o.a.b.splice(2, 1);        // undefined

		equals(0, expected.length);
		done();
	}, 8);

	test("observe('a.b[d=4].', fn, object)", function(equals, done) {
		var data = {a: {b: [{d: 4, n: 1}]}};
		var o    = Observer(data);

		try {
			observe('a.b[d=4].', function(value) {}, o);
		}
		catch(e) {
			equals(true, true);
			done();
		}

		done();
	}, 1);

	test("observe 'a.b[d=\"4\"].n'", function(equals, done) {
		var expected = [1, 2, undefined, 3, undefined];

		var data = {a: {b: [{d: '4', n: 1}]}};
		var o    = Observer(data);

		observe('a.b[d="4"].n', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a = {b: [{d: '4', n: 2}]};
		o.a.b.length = 0;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = [];
		o.a.b.push({d: '9'});
		o.a.b.push({d: '4', n: 3});
		o.a.b.push({d: 3});
		o.a.b.push({e: 30});
		o.a.b.splice(1, 1);

		equals(0, expected.length);
		done();
	}, 6);

	test("observe 'a[0].n'", function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0, undefined, null];

		var data = { a: [] };
		var o    = Observer(data);

		observe('a[0].n', function(value) {
			equals(expected.shift(), value);
		}, o);

		var oa = Observer(o.a);
		oa.push({n: 0});
		oa.push({n: 1});
		oa.push({n: 2});

		oa.length = 0;

		oa.push({n: 1});

		oa.length = 0;
		oa.length = 0;

		oa[0] = {n: 0};
		oa[0] = null;
		oa[0] = {n: null};

		equals(0, expected.length);
		done();
	}, 8);

	test("observe '[0]'", function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = [];
		var o    = Observer(data);

		observe('[0]', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o[0] = 0;
		o[1] = 1;
		o[2] = 2;

		o.length = 0;

		o[0] = 1;

		o.length = 0;
		o.length = 0;

		o[0] = 0;

		equals(expected.length, 0);
		done();
	}, 6);

	test("observe 'a.0.n'", function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = { a: [] };
		var o    = Observer(data);

		observe('a.0.n', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};

		o.a.length = 0;

		o.a[0] = {n: 1};

		o.a.length = 0;
		o.a.length = 0;

		o.a[0] = {n: 0};

		equals(expected.length, 0);
		done();
	}, 6);

	test("observe 'a[0].n'", function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0, undefined, null];

		var data = { a: [] };
		var o    = Observer(data);

		observe('a[0].n', function(value, change) {
			equals(expected.shift(), value);
		}, o);

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};

		o.a.length = 0;

		o.a[0] = {n: 1};

		o.a.length = 0;
		o.a.length = 0;

		o.a[0] = {n: 0};
		o.a[0] = null;
		o.a[0] = {n: null};

		equals(expected.length, 0);
		done();
	}, 8);
});
