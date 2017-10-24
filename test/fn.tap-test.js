
group('Fn.tap', function(test, log) {
	var Fn = window.Fn;

	test('Fn(fn)', function(equals) {
        var functor = Fn.of(3);
        var results = [0, false, null, functor];

        function fn(value) {
            equals(results.shift(), value);
        }

        var tapFn = Fn.tap(fn);

        tapFn(0);
        tapFn(false);
        tapFn(undefined);
        tapFn(null);
        tapFn(functor);
	});
});
