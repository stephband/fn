
import test from "../modules/test/test.js";
import { Stream, add, Timer, get } from '../module.js';

test('Stream()', function(test, log) {
	test('Stream(setup)', function(equals, done) {
		var i = 0;
		var s = Stream(function setup() {
			return {
				shift: function oneToFive() {
					return ++i < 5 ? i : undefined ;
				}
			};
		});

		equals(1, s.shift());
		equals(2, s.shift());
		equals(3, s.shift());
		equals(4, s.shift());
		equals(undefined, s.shift());
        equals(undefined, s.shift());

		done();
	}, 6);

	test('Stream.of(...)', function(equals, done) {
		var s = Stream.of(1,2,3,4);

		equals(1, s.shift());
		equals(2, s.shift());
		equals(3, s.shift());
		equals(4, s.shift());
		equals(undefined, s.shift());
        equals(undefined, s.shift());

		done();
	}, 6);
/*
	test('.chunk()', function(equals, done) {
		var f = Stream.of(0,1,2,3,4,5,6,7,8).chunk(2);
		equals('0,1', f.shift().toArray().join());
		equals('2,3', f.shift().toArray().join());
		equals('4,5', f.shift().toArray().join());
		equals('6,7', f.shift().toArray().join());
		equals(undefined, f.shift());
		done();
	});
*/
	test('.shift()', function(equals, done) {
		var i = 0;
		var s = Stream(function setup() {
			return {
				shift: function oneToFive() {
					return ++i < 5 ? i : undefined ;
				}
			};
		});

		equals(1, s.shift());
		equals(2, s.shift());
		equals(3, s.shift());
		equals(4, s.shift());
		equals(undefined, s.shift());
		done();
	});

	test('.push()', function(equals, done) {
		var s = Stream.of(1,2,undefined,3,4);
		var b = [5,6,7];

		equals(1, s.shift());
		equals(2, s.shift());
		equals(3, s.shift());
		equals(4, s.shift());
		equals(undefined, s.shift());

		s.push.apply(s, b);

		equals(5, s.shift());
		equals(6, s.shift());
		equals(7, s.shift());
		equals(undefined, s.shift());
		done();
	});

	test('.toArray()', function(equals, done) {
		var s1 = Stream.of();
		equals('', s1.toArray().join());

		var s2 = Stream.from([0,1,2,3]);
		equals('0,1,2,3', s2.toArray().join());

		done();
	});

	test('.map()', function(equals, done) {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.map(add(1));
		equals('1,2,3,4', s2.toArray().join());

		done();
	});
/*
	test('.fold()', function(equals, done) {
		var s = Stream.of(1,0,1,0).fold(add, 2);
		equals(2, s.shift());
		equals(3, s.shift());
		equals(3, s.shift());
		equals(4, s.shift());
		equals(4, s.shift());
		equals(undefined, s.shift());

		done();
	});

	test('.reduce()', function(equals, done) {
		var s = Stream.of(1,0,1,0);
		var v = s.reduce(add, 2);
		equals(4, v);
		equals(undefined, s.shift());

		done();
	});
*/
	test('.pipe()', function(equals, done) {
		var s1 = Stream.of(0,1,2,3);
		var s2 = s1.pipe(Stream.of());

		equals('0,1,2,3', s2.toArray().join());



		// Pipe multiple

		var s1 = Stream.of(1,2);
		var s2 = Stream.of(3);
		var s3 = Stream.of(0);

		s3.name = 's3';

		var results = [];

		s1.pipe(s3);
		s2.pipe(s3);

		s3.each(function(value) {
			results.push(value);
		});

		equals('0,1,2,3', results.join());

		results = [];

		s1.push(0);
		s1.push(1);
		s1.push(2);
		s1.push(3);

		equals('0,1,2,3', results.join());

		results = [];

		s2.push(0);
		s2.push(1);
		s2.push(2);
		s2.push(3);

		equals('0,1,2,3', results.join());

		results = [];

		s2.push(0);
		s2.push(1);
		s1.push(2);
		s1.push(3);

		equals('0,1,2,3', results.join());

		results = [];

		s2.push(0);
		s1.push(1);
		s2.push(2);
		s1.push(3);

		equals('0,1,2,3', results.join());

		results = [];

		var s4 = Stream.of(0,1);
		s4.pipe(s3);

		s1.push(2);
		s4.push(3);
		s2.push(4);
		s4.push(5);

		equals('0,1,2,3,4,5', results.join());



		// Pipe then .stop()

		s1 = Stream.of(1,2);
		s2 = Stream.of(3);
		s3 = Stream.of(0);

		s3.name = 's3';

		var results = [];

		s1.pipe(s3);
		s2.pipe(s3);

		s3.each(function(value) {
			results.push(value);
		});

		equals('0,1,2,3', results.join());

		results = [];

		s1.push(0);
		s1.push(1);
		s1.stop();
		s1.push(2);
		s1.push(3);

		equals('0,1', results.join());

		done();
	});

	test('.each()', function(equals, done) {
		var results1 = [];
		var s1 = Stream.of(0,1,2,3).each(function(value) {
			results1.push(value);
		});
		s1.push(4,5);
		equals('0,1,2,3,4,5', results1.join());

	//	console.log('pull from a piped stream...');
	//	var results2 = [];
	//	var s2 = Stream.of(0,1,2,3);
	//	var s3 = s2.pipe(Stream.of()).each(function(value) {
	//		results2.push(value);
	//	});
	//	s2.push(4,5);
	//	equals('0,1,2,3,4,5', results2.join());

		done();
	});
/*
	test('.partition()', function(equals, done) {
		var s = Stream.of(
			[0, "note", 60, 0.5],
			[1, "note", 60, 0.5],
			[2, "pitch", 1],
			[3, "note", 60, 0.5],
			[4, "pitch", 60],
			[5, "tempo", 120]
		)
		.partition(get(1));

		equals('note,note,note', s.shift().map(get(1)).toArray().join());
		equals('pitch,pitch', s.shift().map(get(1)).toArray().join());
		equals('tempo', s.shift().map(get(1)).toArray().join());
		equals(undefined, s.shift());

		done();
	});
*/
	test('.flat()', function(equals, done) {
		equals('0,0,1,1,1,2,3,3,3,3,3,4,4',
			Stream.of([0,0,1,1,1],[2,3],[3,3,3,3],[4,4])
			.flat()
			.toArray()
			.join()
		);
/*
		equals('note,note,note,pitch,pitch,tempo', Stream.of(
				[0, "note", 60, 0.5],
				[1, "note", 60, 0.5],
				[2, "pitch", 1],
				[3, "note", 60, 0.5],
				[4, "pitch", 60],
				[5, "tempo", 120]
			)
			.partition(get(1))
			.flat()
			.map(get(1))
			.toArray()
			.join()
		);

		var s = Stream.of(0,0,1,2,3,3,2,3,0)
			.partition()
			.flat();

		equals([0,0,0,1,2,2,3,3,3].join(), s.toArray().join());

		s.push(0,1,2,4,4,4);
		equals([4,4,4].join(), s.toArray().join());

		s.push(0);
		equals(undefined, s.shift());
		s.push(1);
		equals(undefined, s.shift());
		s.push(4);
		equals(undefined, s.shift());

		s.push(7);
		s.push(8);
		s.push(7);
		s.push(8);
		equals([7,7,8,8].join(), s.toArray().join());
*/
		done();
	});

	test('.merge()', function(equals, done) {
		var s0 = Stream.of(0,1);
		var s1 = Stream.of(2,3);
		var s2 = Stream.of(4,5);

		equals('0,1,2,3,4,5', s0.merge(s1, s2).toArray().join());

		var s0 = Stream.of(0,1);
		var s1 = Stream.of(2,3);
		var s2 = Stream.of(4,5);

		s1.push(6);

		equals('0,1,2,3,6,4,5', s0.merge(s1, s2).toArray().join());
/*
		var s0 = Stream.of(0,1);
		var s1 = Stream.of(2,3);
		var s2 = Stream.of(4,5);
		var s3 = s0.merge(s1, s2);

		equals(0, s3.shift());

		s1.push(6);

		equals(1, s3.shift());
		equals(2, s3.shift());
		equals(3, s3.shift());
		equals(4, s3.shift());
		equals(5, s3.shift());
		equals(6, s3.shift());
*/
		done();
	});

	test('.combine()', function(equals, done) {
		var s0 = Stream.of(0,1);
		var s1 = Stream.of(2,3);
		var s2 = s0.combine(add, s1);

		equals(4, s2.shift());

		s1.push(9);
		equals(10, s2.shift());

		s0.push(9);
		equals(18, s2.shift());

		equals(undefined, s2.shift());

		done();
	});


	test('.unique()', function(equals, done) {
		equals('0,1,2,3,4', Stream.of(0,0,1,1,1,2,3,3,3,3,3,4,4).unique().toArray().join());

		done();
	});

	test('.throttle()', function(equals, done) {
		var buffer = Stream.of(0,1,2,3,4,5);
		var i = 0;

		buffer
		.throttle()
		.each(function(n) {
			++i;
			equals(5, n);
		});

		requestAnimationFrame(function() {
			buffer.push(9);
			buffer.push(19);
			buffer.push(29);
			buffer.push(5);
		});

		setTimeout(function() {
			done();
		}, 300);
	}, 2);

	test('.throttle(time)', function(equals, done) {
		var buffer = Stream.of(0,1,2,3,4,5);
		var i = 0;

		buffer
		.throttle(0.3)
		.each(function(n) {
			++i;
			equals(5, n);
		});

		setTimeout(function() {
			buffer.push(9);
			buffer.push(19);
			buffer.push(29);
			buffer.push(5);
		}, 500);

		setTimeout(function() {
			done();
		}, 1000);
	}, 2);

	test('.throttle(timer)', function(equals, done) {
		var timer  = Timer(0.5);
		var buffer = Stream.of(0,1,2,3,4,5);
		var i = 0;

		buffer
		.throttle(timer)
		.each(function(n) {
			++i;
			equals(5, n);
		});

		timer.request(function() {
			buffer.push(9);
			buffer.push(19);
			buffer.push(29);
			buffer.push(5);
		});

		setTimeout(function() {
			done();
		}, 1200);
	}, 2);

	test('.take()', function(equals, done) {
		var f = Stream.of(0,1,'one',true,2,false,true,'two',3,'three').take(0);
		equals(undefined, f.shift());

		var f = Stream.of(0,1,'one',true,2,false,true,'two',3,'three').take(1);
		equals(0, f.shift());
		equals(undefined, f.shift());

		var f = Stream.of(0,1,'one',true,2,false,true,'two',3,'three').take(3);
		equals(0, f.shift());
		equals(1, f.shift());
		equals('one', f.shift());
		equals(undefined, f.shift());


		var n = -1;
		var f = Stream.of().take(3).each(function(value) {
			equals(++n, value);
		});

		f.push(0,1,2,3,4,5,6,7);
		equals(2, n);

		done();
	});
});
