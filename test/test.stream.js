
console.group('test.stream.js ...');

var Stream = Fn.Stream;

test(' shift', function() {
	var i = 0;
	var s = Fn.Stream(function oneToFive() {
		return ++i < 5 ? i : undefined ;
	});

	equals(1, s.shift());
	equals(2, s.shift());
	equals(3, s.shift());
	equals(4, s.shift());
	equals(undefined, s.shift());
});

//test(' Stream.push()', function() {
//	var s = Stream.of([1,2,undefined,3,4]);
//	var b = [5,6,7];
//
//	equals(1, s.shift());
//	equals(2, s.shift());
//	equals(3, s.shift());
//	equals(4, s.shift());
//	equals(undefined, s.shift());
//
//	s.push.apply(s, b);
//
//	equals(5, s.shift());
//	equals(6, s.shift());
//	equals(7, s.shift());
//	equals(undefined, s.shift());
//});

test('.toArray()', function() {
	var s1 = Fn();
	equals('', s1.toArray().join());

	var s2 = Fn([0,1,2,3]);
	equals( '0,1,2,3', s2.toArray().join());
});

test('.map()', function() {
	var s1 = Fn([0,1,2,3]);
	var s2 = s1.map(Fn.add(1));
	equals('1,2,3,4', s2.toArray().join());
});

//test('.pipe()', function() {
//	var s1 = Fn([0,1,2,3]);
//	var s2 = s1.pipe(Stream.of());
//
//	equals('0,1,2,3', s2.toArray().join());
//});

test('.each()', function() {
	console.log('pull a stream...');
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
});

test('.group()', function() {
	var s = Stream.of(
		[0, "note", 60, 0.5],
		[1, "note", 60, 0.5],
		[2, "pitch", 1],
		[3, "note", 60, 0.5],
		[4, "pitch", 60],
		[5, "tempo", 120]
	)
	.group(Fn.get(1));

	equals('note,note,note', s.shift().map(Fn.get(1)).toArray().join());
	equals('pitch,pitch', s.shift().map(Fn.get(1)).toArray().join());
	equals('tempo', s.shift().map(Fn.get(1)).toArray().join());
	equals(undefined, s.shift());
});

test('.join()', function() {
	equals('0,0,1,1,1,2,3,3,3,3,3,4,4', Stream.of([0,0,1,1,1],[2,3],[3,3,3,3],[4,4]).join().toArray().join());

	equals('note,note,note,pitch,pitch,tempo',
		Stream.of(
			[0, "note", 60, 0.5],
			[1, "note", 60, 0.5],
			[2, "pitch", 1],
			[3, "note", 60, 0.5],
			[4, "pitch", 60],
			[5, "tempo", 120]
		)
		.group(Fn.get(1))
		.join()
		.map(Fn.get(1))
		.toArray()
		.join()
	);

	var s = Stream.of(0,0,1,2,3,3,2,3,0)
		.group()
		.join();

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
});

test('.unique()', function() {
	equals('0,1,2,3,4', Stream.of(0,0,1,1,1,2,3,3,3,3,3,4,4).unique().toArray().join());
});

test('.group().concatParallel()', function() {
	var s = Stream.of(0,0,1,2,3,3,2,3,0)
		.group()
		.concatParallel();

	equals([0,0,1,2,3,3,2,3,0].join(), s.toArray().join());

	s.push(0);
	equals(0, s.shift());
	s.push(1);
	equals(1, s.shift());
	s.push(4);
	equals(4, s.shift());

	s.push(1);
	s.push(2);
	s.push(4);
	s.push(2);
	equals([1,2,4,2].join(), s.toArray().join());

	s.push(0,1,2,4,4,4,2);
	equals([0,1,2,4,4,4,2].join(), s.toArray().join());
});

test('.throttle()', function() {
	var buffer = Stream.of(0,1,2,3,4,5);

	buffer
	.throttle()
	.each(function(n) {
		equals(5, n);
	});

	buffer.push(9);
	buffer.push(19);
	buffer.push(29);
	buffer.push(5);
});

test('.throttle(time)', function() {
	var buffer = Stream.of(0,1,2,3,4,5);

	buffer
	.throttle(3000)
	.each(function(n) {
		equals(5, n);
	});

	buffer.push(9);
	buffer.push(19);
	buffer.push(29);
	buffer.push(5);
});

test('.delay(time)', function() {
	var buffer = Stream.of(0,1,2,3,4,5);
	var i = 0;

	buffer
	.delay(1500)
	.each(function(n) {
		equals(i++, n);
	});

	buffer.push(6);
	buffer.push(7);
	buffer.push(8);
	buffer.push(9);

	equals(6, i);

	setTimeout(function functionName() {
		equals(10, i);
	}, 2000);
});

console.groupEnd();
