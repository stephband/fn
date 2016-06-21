
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

test('.add', function() {
	var fn = Fn.add(1);
	equals(1, fn.length);
	equals(1, fn(0));
});

test('.equals(a, b)', function() {
	equals(Fn.equals(0, 0), true);
	equals(Fn.equals(1, 1), true);
	equals(Fn.equals(false, false), true);
	equals(Fn.equals('false', 'false'), true);
	equals(Fn.equals([], []), true);
	equals(Fn.equals([0.3], [0.3]), true);
	equals(Fn.equals({a:0,b:1}, {b:1,a:0}), true);
	equals(Fn.equals({a:0,b:1,c:{d:2}}, {b:1,a:0,c:{d:2}}), true);
	equals(Fn.equals({a:[{a:6}]}, {a:[{a:6}]}), true);
});

console.groupEnd();
