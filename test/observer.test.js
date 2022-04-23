
import tests        from "../modules/test.js";
import { Observer } from "../observer/observer.js";
import observe      from "../observer/observe.js";

tests('Observer()', function(test, log) {
	test("observe('.', object)", function(equals, done) {
		var expected = [{}, {a:0},{a:1},{a:2},{}];
		var data = {};
		var o    = Observer(data);

		const observable = observe('.', o)
		.each((value) => equals(expected.shift(), value));

		o.a = 0;
		o.a = 1;
		o.a = 2;
		o.a = undefined;

		observable.stop();
		o.a = 3;

		equals(0, expected.length);
		done();
	}, 6);


	test("observe('a', object)", function(equals, done) {
		var expected = [0,1,2,undefined];
		var data = {};
		var o    = Observer(data);

		const observable = observe('a', o)
		.each((value) => equals(expected.shift(), value));

		o.a = 0;
		o.a = 1;
		o.a = 2;
		o.a = undefined;

		observable.stop();
		o.a = 3;

		equals(0, expected.length);
		done();
	}, 5);


	test("observe('a.', object)", function(equals, done) {
		var expected = [{b:0},{b:1},2,3,null];
		var data = {};
		var o    = Observer(data);

		const observable = observe('a.', o)
		.each((value) => equals(expected.shift(), value));

		o.a = { b: 0 };
		o.a.b = 1;
		o.a = 2;
		o.a = 3;
		o.a = null;

		observable.stop();
		o.a = { b: 4 };

		equals(0, expected.length);
		done();
	}, 6);


	test("observe('a.b', object)", function(equals, done) {
		var expected = [0,1,2,3,undefined];
		var data = {};
		var o    = Observer(data);

		const observable = observe('a.b', o)
		.each((value) => equals(expected.shift(), value));

		o.a = { b: 0 };
		o.a.b = 1;
		const oa = Observer({ b: 2 });
		o.a = oa;
		oa.b = 3;
		o.a = undefined;

		observable.stop();
		o.a = { b: 4 };

		equals(0, expected.length);
		done();
	}, 6);


	test("observe('.', object, object) - with initial value", function(equals, done) {
		var expected = [{a:0},{a:1},{a:2},{}];
		var data = {};
		var o    = Observer(data);

		const observable = observe('.', o, o)
		.each((value) => equals(expected.shift(), value));

		o.a = 0;
		o.a = 1;
		o.a = 2;
		o.a = undefined;

		observable.stop();
		o.a = 3;

		equals(0, expected.length);
		done();
	}, 5);


	test("observe('a', object, 0) - with initial value", function(equals, done) {
		var expected = [1,2,undefined];
		var data = { a: 0 };
		var o    = Observer(data);

		const observable = observe('a', o, 0)
		.each((value) => equals(expected.shift(), value));

		o.a = 0;
		o.a = 1;
		o.a = 2;
		o.a = undefined;

		observable.stop();
		o.a = 3;

		equals(0, expected.length);
		done();
	}, 4);


	test("observe('a.b', object, 0) - with initial value", function(equals, done) {
		var expected = [1,2,3,undefined];
		var data = { a: { b: 0 }};
		var o    = Observer(data);

		const observable = observe('a.b', o, 0)
		.each((value) => equals(expected.shift(), value));

		o.a = { b: 0 };
		o.a.b = 1;
		const oa = Observer({ b: 2 });
		o.a = oa;
		oa.b = 3;
		o.a = undefined;

		observable.stop();
		o.a = { b: 4 };

		equals(0, expected.length);
		done();
	}, 5);
/* */
});
