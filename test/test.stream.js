
console.group('test.stream.js ...');

test(' next', function() {
	var i = 0;
	var s = Fn.Stream(function setup() {
		return {
			next: function next() {
				return ++i < 5 ? i : undefined ;
			}
		};
	});

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());
});

test(' BufferStream.push()', function() {
	var s = Fn.BufferStream([1,2,3,4]);
	var b = [5,6,7];

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());

	s.push.apply(s, b);

	equals(5, s.next());
	equals(6, s.next());
	equals(7, s.next());
	equals(undefined, s.next());
});

test(' ReadStream.push()', function() {
	var i = 0;

	function noop() {}

	var s = Fn.ReadStream([1,2,3,4]);
	var b = [5,6,7];

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());

	var error;

	try {
		s.push.apply(s, b);
	}
	catch(e) {
		error = e;
	}

	equals(Fn.toClass(error), 'Error');

	equals(undefined, s.next());
	equals(undefined, s.next());
});


test('.toArray()', function() {
	var s1 = Fn();
	equals('', s1.toArray().join());

	var s2 = Fn([0,1,2,3]);
	equals( '0,1,2,3', s2.toArray().join());
});

test('.map()', function() {
	var s1 = Fn([0,1,2,3]);
	var s2 = s1.map(function(n) { return n + 1; });
	equals('1,2,3,4', s2.toArray().join());
});

//test('.pipe()', function() {
//
//	var s1 = Fn([0,1,2,3]);
//	var s2 = s1.pipe();
//	var s3 = s1.pipe().map(Fn.add(2));
//
//	equals('0,1,2,3', s2.toArray().join());
//	equals('2,3,4,5', s3.toArray().join());
//});

test('.apply()', function() {
	var s1 = Fn().map(Fn.add(2));
	equals(4, s1.apply(null, [2]));

	log('.call()...');
	equals(12, s1.call(null, 10));
});

test('.pull()', function() {

	console.log('pull a stream...');
	var results1 = [];
	var s1 = Fn.BufferStream([0,1,2,3]).pull(function(value) {
		results1.push(value);
	});
	s1.push(4,5);
	equals('0,1,2,3,4,5', results1.join());

	console.log('pull from a piped stream...');
	var results2 = [];
	var s2 = Fn.BufferStream([0,1,2,3]);
	var s3 = s2.pipe(Fn.BufferStream()).pull(function(value) {
		results2.push(value);
	});
	s2.push(4,5);
	equals('0,1,2,3,4,5', results2.join());
});

test('.group()', function() {
	var s = Fn.BufferStream([
		[0, "note", 60, 0.5],
		[1, "note", 60, 0.5],
		[2, "pitch", 1],
		[3, "note", 60, 0.5],
		[4, "pitch", 60],
		[5, "tempo", 120]
	])
	.group(Fn.get(1));

	equals('note,note,note', s.next().map(Fn.get(1)).toArray().join());
	equals('pitch,pitch', s.next().map(Fn.get(1)).toArray().join());
	equals('tempo', s.next().map(Fn.get(1)).toArray().join());
	equals(undefined, s.next());
});

test('.chain()', function() {
	equals('0,0,1,1,1,2,3,3,3,3,3,4,4', Fn.BufferStream([[0,0,1,1,1],[2,3],[3,3,3,3],[4,4]]).chain().toArray().join());

	equals('note,note,note,pitch,pitch,tempo',
		Fn.BufferStream([
			[0, "note", 60, 0.5],
			[1, "note", 60, 0.5],
			[2, "pitch", 1],
			[3, "note", 60, 0.5],
			[4, "pitch", 60],
			[5, "tempo", 120]
		])
		.group(Fn.get(1))
		.chain()
		.map(Fn.get(1))
		.toArray()
		.join()
	);

	var s = Fn.BufferStream([0,0,1,2,3,3,2,3,0])
		.group()
		.chain();

	equals([0,0,0,1,2,2,3,3,3].join(), s.toArray().join());

	s.push(0,1,2,4,4,4);
	equals([4,4,4].join(), s.toArray().join());

	s.push(0);
	equals(undefined, s.next());
	s.push(1);
	equals(undefined, s.next());
	s.push(4);
	equals(undefined, s.next());

	s.push(7);
	s.push(8);
	s.push(7);
	s.push(8);
	equals([7,7,8,8].join(), s.toArray().join());
});

test('.unique()', function() {
	equals('0,1,2,3,4', Fn.BufferStream([0,0,1,1,1,2,3,3,3,3,3,4,4]).unique().toArray().join());
});

test('.group().concatParallel()', function() {
	var s = Fn.BufferStream([0,0,1,2,3,3,2,3,0])
		.group()
		.concatParallel();

	equals([0,0,1,2,3,3,2,3,0].join(), s.toArray().join());

	s.push(0);
	equals(0, s.next());
	s.push(1);
	equals(1, s.next());
	s.push(4);
	equals(4, s.next());

	s.push(1);
	s.push(2);
	s.push(4);
	s.push(2);
	equals([1,2,4,2].join(), s.toArray().join());

	s.push(0,1,2,4,4,4,2);
	equals([0,1,2,4,4,4,2].join(), s.toArray().join());
});

test('.throttle()', function() {
	var buffer = Fn.BufferStream([0,1,2,3,4,5]);

	buffer
	.throttle()
	.pull(function(n) {
		equals(5, n);
	});

	buffer.push(9);
	buffer.push(19);
	buffer.push(29);
	buffer.push(5);
});

test('.throttle(time)', function() {
	var buffer = Fn.BufferStream([0,1,2,3,4,5]);

	buffer
	.throttle(3000)
	.pull(function(n) {
		equals(5, n);
	});

	buffer.push(9);
	buffer.push(19);
	buffer.push(29);
	buffer.push(5);
});

test('.delay(time)', function() {
	var buffer = Fn.BufferStream([0,1,2,3,4,5]);
	var i = 0;

	buffer
	.delay(1500)
	.pull(function(n) {
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
