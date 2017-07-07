
group('Observable()', function(test, log) {

	var assign = Object.assign;
	var Store  = window.Store;
	var Observable = window.Observable;
	var observe = Observable.observe;
	
	test("observe 'a.b.c'", function(equals) {
		var expected = [1,2,3,4,undefined,5,[6],[7],[8],[8,9],10,{},{d:11}];

		var data = {a: {b: {c: 1}}};
		var o    = Observable(data);
	
		observe(o, 'a.b.c', function(value, change) {
			//console.log.apply(
			//	console,
			//	Array.prototype.map.call(arguments, JSON.stringify)
			//);

			equals(expected.shift(), value);
		});

		o.a.b.c = 2;
		o.a.b = {c: 3};
		o.a = {b: {c: 4}};
		o.a.b.c = undefined;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = {};
		o.a.b.c = 5;
		o.a.b.c = [6];
		o.a.b.c = [7];
		o.a.b.c[0] = 8;
		o.a.b.c[1] = 9;
		o.a.b.c = 10;
		o.a.b.c = {};
		o.a.b.c.d = 11;

		equals(0, expected.length);
	});
	
	test("observe 'a.b[d=\"4\"]'", function(equals) {
		var expected = [
			{"d":4,"n":1},
			{"d":4,"n":2},
			undefined,
			{"d":4,"n":3},
			undefined
		];

		var data = {a: {b: [{d: 4, n: 1}]}};
		var o    = Observable(data);
	
		observe(o, 'a.b[d="4"]', function(value, change) {
			//console.log.apply(
			//	console,
			//	Array.prototype.map.call(arguments, JSON.stringify)
			//);

			equals(expected.shift(), value);
		});
	
		o.a = {b: [{d: 4, n: 2}]};
		o.a.b.length = 0;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = [];
		o.a.b.push({d: 9});
		o.a.b.push({d: 4, n: 3});
		o.a.b.push({d: 3});
		o.a.b.push({e: 30});
		o.a.b.splice(1, 1);
	});
	
	test("observe 'a.b[d=\"4\"].n'", function(equals) {
		var expected = [1, 2, undefined, 3, undefined];

		var data = {a: {b: [{d: 4, n: 1}]}};
		var o    = Observable(data);
	
		observe(o, 'a.b[d="4"].n', function(value, change) {
			equals(expected.shift(), value);
		});
	
		o.a = {b: [{d: 4, n: 2}]};
		o.a.b.length = 0;
		o.a.b = undefined;
		o.a = undefined;
		o.a = {};
		o.a.b = [];
		o.a.b.push({d: 9});
		o.a.b.push({d: 4, n: 3});
		o.a.b.push({d: 3});
		o.a.b.push({e: 30});
		o.a.b.splice(1, 1);
	});

	test("observe '' (object)", function(equals) {
		var expected = [
			{},
			{a: 0},
			{a: 0, b: 1},
			{a: 2, b: 1},
		];

		var data = {};
		var o    = Observable(data);
	
		observe(o, '', function(value, change) {
			//console.log.apply(
			//	console,
			//	Array.prototype.map.call(arguments, JSON.stringify)
			//);

			equals(expected.shift(), value);
		});
	
		o.a = 0;
		o.b = 1;
		o.a = 2;
	});
	
	test("observe '' (array)", function(equals) {
		var expected = [
			[],
			[0],
			[0,1],
			[0,1,2],
			[0],
			[0,1],
			[0,1,2],
			[],
			[0]
		];

		var data = [];
		var o    = Observable(data);
	
		observe(o, '', function(value, change) {
			//console.log.apply(
			//	console,
			//	Array.prototype.map.call(arguments, JSON.stringify)
			//);

			equals(expected.shift(), value);
		});
	
		o[0] = 0;
		o[1] = 1;
		o[2] = 2;
		
		o.length = 1;
	
		o[1] = 1;
		o[2] = 2;
	
		o.length = 0;
		o.length = 0;
		
		o[0] = 0;
	});
	
	test("observe '[0]'", function(equals) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = [];
		var o    = Observable(data);

		observe(o, '[0]', function(value, change) {
			equals(expected.shift(), value);
		});
	
		o[0] = 0;
		o[1] = 1;
		o[2] = 2;
		
		o.length = 0;

		o[0] = 1;
	
		o.length = 0;
		o.length = 0;
		
		o[0] = 0;
	});

	test("observe 'a.0.n'", function(equals) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = { a: [] };
		var o    = Observable(data);

		observe(o, 'a.0.n', function(value, change) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};

		o.a.length = 0;

		o.a[0] = {n: 1};

		o.a.length = 0;
		o.a.length = 0;
		
		o.a[0] = {n: 0};
	});

	test("observe 'a[0].n'", function(equals) {
		var expected = [0, undefined, 1, undefined, 0];

		var data = { a: [] };
		var o    = Observable(data);

		observe(o, 'a[0].n', function(value, change) {
			equals(expected.shift(), value);
		});

		o.a[0] = {n: 0};
		o.a[1] = {n: 1};
		o.a[2] = {n: 2};
		
		o.a.length = 0;
		
		o.a[0] = {n: 1};
		
		o.a.length = 0;
		o.a.length = 0;
		
		o.a[0] = {n: 0};
	});
});
