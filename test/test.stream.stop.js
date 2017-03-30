
var Stream = window.Stream;

test('.stop()', function() {
	var s = Stream.of(0,1);
	var results = [];

	s.each(function(value) { results.push(value); });

	s.stop();
	s.push(2);
	s.push(3);

	equals('0,1', results.join());
});
