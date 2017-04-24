
group('Stream.Property(name, object)', function() {
	var Stream   = window.Stream;
	var Property = Stream.Property;

	test('.each()', function() {
		var o = { a: 1 };

		Property('a', o).each(function(a) {
			console.log(a);
		});

		o.a = 2;
	});
});
