
group('Stream.Property(name, object)', function() {
	var Stream   = window.Stream;
	var Property = Stream.Property;

	test('.each()', function() {
		var i = 0;
		var o = { a: 0 };

		Property('a', o).each(function(a) {
			equals(++i, a);
		});

		o.a = 1;
		o.a = 2;

		equals(2, i, 'Test count is wrong');
	});
});
