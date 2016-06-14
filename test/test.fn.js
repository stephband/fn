
console.group('test.fn.js ...');

test('.toStringType', function() {
	equals('url',    Fn.toStringType('http://cruncher.ch/example.html?q=78'));
	equals('email',  Fn.toStringType('info@cruncher.ch'));
	equals('int',    Fn.toStringType('78'));
	equals('float',  Fn.toStringType('78.00001'));
	equals('date',   Fn.toStringType('2011-06-12'));
	equals('string', Fn.toStringType('2011-13-01'));
	equals('string', Fn.toStringType('2011-12-32'));
	equals('string', Fn.toStringType('Hello me old peoples.'));
});

console.groupEnd();
