
console.group('test.functor.js ...');

var Functor = Fn.Functor;

test(' Functor(fn)', function() {
	var fr = Functor(function() { return 6; });

	equals(6, fr.shift());
	equals(6, fr.shift());
	equals(6, fr.shift());
});

test('.of()', function() {

	var fr = Functor.of(6);
	equals(6, fr.shift());
	equals(undefined, fr.shift());

	var fr = Functor.of(0,'lamb',true,false);
	equals(0, fr.shift());
	equals('lamb', fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Functor.of(undefined,true,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());

	var fr = Functor.of(true,undefined,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());
});

test('.map()', function() {
	var fr = Functor(function() { return 6; }).map(Fn.add(2));
	equals(8, fr.shift());
	equals(8, fr.shift());
	equals(8, fr.shift());

	var fr = Functor.of(6).map(Fn.add(2));
	equals(8, fr.shift());
	equals(undefined, fr.shift());

	var fr = Functor.of(0,'lamb',true,false,null).map(Fn.isDefined);
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals(undefined, fr.shift());
});

test('.join()', function() {
	var fr = Functor(function() { return [0,1]; }).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Functor.of([0,1,0],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Functor.of([0,1,0],undefined,[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());

	var fr = Functor.of([0,1,0],[undefined],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(undefined, fr.shift());
});

test('.chain()', function() {
	var n = 0;

	function toJust01() {
		return Functor.of(0,1);
	}

	function toJust01Nothing() {
		return n++ ? Functor.of(0,1) : Functor.of() ;
	}

	var fr = Functor(function() { return 1; }).chain(toJust01);

	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Functor.of(1,0).chain(toJust01);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(undefined, fr.shift());

	console.log('ignores undefined...');

	var fr = Functor.of(1,0).chain(toJust01Nothing);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
});


test('.each()', function() {
	var buffer = [];
	var fr = Functor.of(1,0,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());

	var buffer = [];
	var fr = Functor.of(1,0,undefined,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());
});

test('.reduce()', function() {
	var n = Functor.of(1,0,1,0).reduce(Fn.add, 2);
	equals(4, n);
});

test('.concat()', function() {
	var n = Functor.of(1,0,1,0).concat([8,9]);
	equals('1,0,1,0,8,9', n.toArray().join());

	var n = Functor.of(1,0,1,0).concat(Functor.of(8,9));
	equals('1,0,1,0,8,9', n.toArray().join());
});


console.groupEnd();
