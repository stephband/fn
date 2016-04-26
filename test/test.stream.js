
console.group('Testing Stream...');

test('.next()', function() {
	var i = 0;
	var s = Fn.Stream(function next() {
		return ++i < 5 ? i : undefined ;
	});

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());
});

test(' BufferStream.on(\'next\')', function() {
	var s = Fn.BufferStream([1,2,3,4]);
	var b = [5,6,7];

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());

	s.on('next', function() {
		s.push(b.shift());
	});

	equals(5, s.next());
	equals(6, s.next());
	equals(7, s.next());
	equals(undefined, s.next());
});

test(' ReadStream.on(\'next\')', function() {
	var i = 0;

	function noop() {}

	var s = Fn.ReadStream([1,2,3,4]);
	var b = [5,6,7];

	equals(1, s.next());
	equals(2, s.next());
	equals(3, s.next());
	equals(4, s.next());
	equals(undefined, s.next());

	s.on('next', function() {
		s.push(b.shift());
	});

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

test('.pipe()', function() {

	var s1 = Fn([0,1,2,3]);
	var s2 = s1.pipe();
	var s3 = s1.pipe().map(Fn.add(2));

	equals('0,1,2,3', s2.toArray().join());
	equals('2,3,4,5', s3.toArray().join());
});

test('.apply()', function() {
	var s1 = Fn().map(Fn.add(2));
	equals(4, s1.apply(null, [2]));

	log('.call()...');
	equals(12, s1.call(null, 10));
});

test('.pull()', function() {

	console.log('unpiped...');

	var results1 = [];
	var s1 = Fn.BufferStream([0,1,2,3]).pull(function(value) {
		results1.push(value);
	});
	s1.push(4,5);
	equals('0,1,2,3,4,5', results1.join());

	console.log('piped...');

	var results2 = [];
	var s2 = Fn.BufferStream([0,1,2,3]);
	var s3 = s2.pipe().pull(function(value) { results2.push(value); });
	s2.push(4,5);
	equals('0,1,2,3,4,5', results2.join());
});

test('.concatSerial()', function() {
	var results1 = [];
	var s = Fn.BufferStream([
			[0,1,2,3,4],
			[5],
			[],
			[6,7]
		])
		.concatSerial();

	equals('0,1,2,3,4,5,6,7', s.toArray().join());
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

test('.group().concatSerial()', function() {
	var s = Fn.BufferStream([0,0,1,2,3,3,2,3,0])
		.group()
		.concatSerial();

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

console.groupEnd();
