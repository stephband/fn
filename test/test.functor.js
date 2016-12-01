
console.group('test.functor.js ...');

var Fn = Fn;

test(' Fn(fn)', function() {
	var fr = Fn(function() { return 6; });

	equals(6, fr.shift());
	equals(6, fr.shift());
	equals(6, fr.shift());
});

test('.of()', function() {

	var fr = Fn.of(6);
	equals(6, fr.shift());
	equals(undefined, fr.shift());

	var fr = Fn.of(0,'lamb',true,false);
	equals(0, fr.shift());
	equals('lamb', fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Fn.of(undefined,true,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());

	var fr = Fn.of(true,undefined,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());
});

test('.map(fn)', function() {
	var fr = Fn(function() { return 6; }).map(Fn.add(2));
	equals(8, fr.shift());
	equals(8, fr.shift());
	equals(8, fr.shift());

	var fr = Fn.of(6).map(Fn.add(2));
	equals(8, fr.shift());
	equals(undefined, fr.shift());

	var fr = Fn.of(0,'lamb',true,false,null).map(Fn.isDefined);
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());
});

test('.join()', function() {
	var fr = Fn(function() { return [0,1]; }).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Fn.of([0,1,0],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Fn.of([0,1,0],undefined,[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());

	var fr = Fn.of([0,1,0],[undefined],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());
});

test('.chain(fn)', function() {
	var n = 0;

	function toJust01() {
		return Fn.of(0,1);
	}

	function toJust01Nothing() {
		return n++ ? Fn.of(0,1) : Fn.of() ;
	}

	var fr = Fn(function() { return 1; }).chain(toJust01);

	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Fn.of(1,0).chain(toJust01);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Fn.of(1,0).chain(toJust01Nothing);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
});


test('.each(fn)', function() {
	var buffer = [];
	var fr = Fn.of(1,0,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());

	var buffer = [];
	var fr = Fn.of(1,0,undefined,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());
});

test('.reduce(fn, value)', function() {
	var n = Fn.of(1,0,1,0).reduce(Fn.add, 2);
	equals(4, n);
});

test('.concat(object)', function() {
	var n = Fn.of(1,0,1,0).concat([8,9]);
	equals('1,0,1,0,8,9', n.toArray().join());

	var n = Fn.of(1,0,1,0).concat(Fn.of(8,9));
	equals('1,0,1,0,8,9', n.toArray().join());
});

test('.stringify()', function() {
	var n = Fn.of(1,0,1,{a:7}).stringify();
	equals('1', n.shift());
	equals('0', n.shift());
	equals('1', n.shift());
	equals('{"a":7}', n.shift());
});

test('.parse()', function() {
	var n = Fn.of('{"a":7}').parse();
	equals(7, n.shift().a);
	equals(undefined, n.shift());
});

test('.batch(n)', function() {
	var f = Fn.of(0,1,2,3,4,5,6,7,8).batch(2);
	equals('0,1', f.shift().toArray().join());
	equals('2,3', f.shift().toArray().join());
	equals('4,5', f.shift().toArray().join());
	equals('6,7', f.shift().toArray().join());
	equals(undefined, f.shift());
});

test('.group(fn)', function() {
	var f = Fn.of(0,1,'one',true,2,false,true,'two',3,'three').group(Fn.toType);
	equals('0,1,2,3', f.shift().toArray().join());
	equals('one,two,three', f.shift().toArray().join());
	equals('true,false,true', f.shift().toArray().join());
	equals(undefined, f.shift());

	var f = Fn.of({a:0},{a:0},{a:'0'},{a:'0'},{b:5}).group(Fn.get('a'));
	equals('[{"a":0},{"a":0}]', JSON.stringify(f.shift()));
	equals('[{"a":"0"},{"a":"0"}]', JSON.stringify(f.shift()));
	equals('[{"b":5}]', JSON.stringify(f.shift()));
	equals(undefined, f.shift());
});

//test('.groupTo(fn, object)', function() {
//	var f = Fn.of(0,1,'one',true).groupTo(Fn.toType, {}).stringify();
//	equals('{"number":[0,1],"string":["one"],"boolean":[true]}', f.shift());
//	equals(undefined, f.shift());
//
//	var f = Fn.of(0,1,'one',true).groupTo(Fn.toType, new Map());
//	equals('one', f.shift().get('string').toArray().join());
//	equals(undefined, f.shift());
//});


console.groupEnd();
