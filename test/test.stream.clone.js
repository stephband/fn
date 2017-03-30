
group('.clone()', function(test) {
	var Stream = window.Stream;

	test('Clone two times, consume them', function() {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.clone();
		var s3 = s1.clone();
	
		equals('0,1,2,3', s2.toArray().join());
		equals('0,1,2,3', s3.toArray().join());
	})

	test('Clone and consume, two times', function() {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.clone().toArray();
		var s3 = s1.clone().toArray();
	
		equals('0,1,2,3', s2.join());
		equals('0,1,2,3', s3.join());
	});

	test('Clone and consume, two times', function() {
		var v1, v2, v3;
		s1 = Stream.from([0,1,2,3]);
	
		var s2 = s1.clone().each(function(value) { v2 = value; });
		var s3 = s1.clone().each(function(value) { v3 = value; });
		var s1 = s1.each(function(value) { v1 = value; });
	
		s1.push(4, 5);
	
		equals(5, v1);
		equals(5, v2);
		equals(5, v3);
	});
	
	test('stream.clone() clone.shift()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		s0.push(2,3,4);
	
		equals(0, s1.shift());
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
	
	test('stream.clone() stream.stop() clone.shift()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		// Setup s0
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		// Stop before setup s1
		s0.push(2,3,4);
		s0.stop();
	
		equals(0, s1.shift());
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
	
	test('stream.clone() clone.shift() stream.stop()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		// Stop after setup
		s0.push(2,3,4);
		equals(0, s1.shift());
		s0.stop();
	
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
});
