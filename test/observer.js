
import test         from "../modules/test.js";
import { Observer } from "../observer/observer.js";
import observe      from "../observer/observe.js";

test("observe('.', object)", [{}, {a:0},{a:1},{a:2}, {}], function(expect, done) {
	var data     = {};
	var o        = Observer(data);

	const observable = observe('.', o)
	.each((value) => expect(value));

	o.a = 0;
	o.a = 1;
	o.a = 2;
	o.a = undefined;

	observable.stop();
	o.a = 3;

	done();
});

test("observe('a', object)", [0,1,2,undefined], function(expect, done) {
	var data     = {};
	var o        = Observer(data);

	const observable = observe('a', o)
	.each((value) => expect(value));

	o.a = 0;
	o.a = 1;
	o.a = 2;
	o.a = undefined;

	observable.stop();
	o.a = 3;

	done();
});

test("observe('a.', object)", [{b:0},{b:1},2,3,null], function(expect, done) {
	var data = {};
	var o    = Observer(data);

	const observable = observe('a.', o)
	.each((value) => expect(value));

	o.a = { b: 0 };
	o.a.b = 1;
	o.a = 2;
	o.a = 3;
	o.a = null;

	observable.stop();
	o.a = { b: 4 };

	done();
});

test("observe('a.b', object)", [0,1,2,3,undefined], function(expect, done) {
	var data = {};
	var o    = Observer(data);

	const observable = observe('a.b', o)
	.each((value) => expect(value));

	o.a = { b: 0 };
	o.a.b = 1;
	const oa = Observer({ b: 2 });
	o.a = oa;
	oa.b = 3;
	o.a = undefined;

	observable.stop();
	o.a = { b: 4 };

	done();
});

test("observe('.', object, object) - with initial value", [{a:0},{a:1},{a:2},{}], function(expect, done) {
	var data = {};
	var o    = Observer(data);

	const observable = observe('.', o, o)
	.each((value) => expect(value));

	o.a = 0;
	o.a = 1;
	o.a = 2;
	o.a = undefined;

	observable.stop();
	o.a = 3;

	done();
});

test("observe('a', object, 0) - with initial value", [1,2,undefined], function(expect, done) {
	var data = { a: 0 };
	var o    = Observer(data);

	const observable = observe('a', o, 0)
	.each((value) => expect(value));

	o.a = 0;
	o.a = 1;
	o.a = 2;
	o.a = undefined;

	observable.stop();
	o.a = 3;

	done();
});

test("observe('a.b', object, 0) - with initial value", [1,2,3,undefined], function(expect, done) {
	var data = { a: { b: 0 }};
	var o    = Observer(data);

	const observable = observe('a.b', o, 0)
	.each((value) => expect(value));

	o.a = { b: 0 };
	o.a.b = 1;
	const oa = Observer({ b: 2 });
	o.a = oa;
	oa.b = 3;
	o.a = undefined;

	observable.stop();
	o.a = { b: 4 };

	done();
});
