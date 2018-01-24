
group('.clone()', function(test, log) {
	var Stream = window.Stream;

	test('new Date() behaviour in this browser', function(equals) {
        // Sets local time
        JSON.stringify(new Date(2018, 0, 0));

        // Sets universal time
        JSON.stringify(new Date('2018-01-01'));
	});
});
