import { Observer, Stream, test as group } from '../../fn/fn.js';

group('Stream.observe()', function(test, log) {
	test('Observer.observe(object, path, fn)', function(equals, done) {
		var expected = [0, undefined, 1, undefined, 0];

		var data   = { a: [] };
		var o      = Observer(data);
		var unobserve = Observer.observe(o, 'a[0].n', function(value) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};

		o.a.length = 0;

		o.a[0] = {n: 1};

		o.a.length = 0;
		o.a.length = 0;

		o.a[0] = {n: 0};

		unobserve();

		o.a[0] = {n: 2};

		done();
	}, 5);

	test('Stream.observe(path, object)', function(equals, done) {
		var expected = [0, null, 1, null, 0];

		var data   = { a: [] };
		var o      = Observer(data);
		var stream = Stream
		.observe('a[0].n', o)
		.each(function(value) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};

		o.a.length = 0;

		o.a[0] = {n: 1};

		o.a.length = 0;
		o.a.length = 0;

		o.a[0] = {n: 0};

		stream.stop();

		o.a[0] = {n: 2};

		done();
	}, 5);

	test('Stream.observe(path, object)', function(equals, done) {
		var expected = [0, null, 0, 10, 20];

		var data   = { a: [] };
		var o      = Observer(data);
		var stream = Stream
		.observe('a[0].n', o)
		.each(function(value) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};

		o.a.length = 0;

		o.a[0] = {n: 0};

		stream.push(10);
		equals(10, data.a[0].n);

		stream.push(20);
		equals(20, data.a[0].n);
		equals(0, expected.length);

		stream.stop();
		stream.push(30);
		equals(20, data.a[0].n);

		o.a[0] = {n: 2};

		done();
	}, 9);
});
