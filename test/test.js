
(function(window) {
	"use strict";

	var A        = Array.prototype;
	var Fn       = window.Fn;

	var id       = Fn.id;
	var overload = Fn.overload;
	var done     = Fn.noop;

	var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

	var domify = overload(toType, {
		'string': function(template) {
			return createFixture(template);
		},

		'function': function(template) {
			return createFixture(multiline(template));
		},

		'default': function(template) {
			// WHAT WHY?
			var nodes = typeof template.length === 'number' ? template : [template] ;
			append(nodes);
			return nodes;
		}
	});

	function createFixture(html) {
		var section = document.createElement('section');
		section.innerHTML = html;
		document.body.appendChild(section);
		return section;
	}

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('multiline: comment missing.'); }
		return match[1];
	}

	function toType(object) {
		return typeof object;
	}

	function parse(string) {
		return (new window.DOMParser()).parseFromString(string, 'text/html');
	}

	function equals(expected, value, message) {
		if (!Fn.equals(value, expected)) {
			console.trace('%c' +
				('Test: ' + 
				'Expected ' + JSON.stringify(expected) + ', ' +
				'received ' + JSON.stringify(value) + '.' +
				( message ? ' ' + message : '')),
				'color: #ee8833; font-weight: 700;'
			);
		}
	}

	function group(name, fn, template) {
		console.group('%c' + name, 'color: #ffffff; background-color: #222222; padding: 0.25em 0.5em; border-radius: 0.25em; font-weight: 300;');
		var nodes = domify(template);
		var tests = [];

		function next() {
			var args = tests.shift();
			if (!args) { return; }
			test(args[0], args[1], args[2], next);
		}

		fn(function test(name, fn, n) {
			tests.push(arguments);
		}, console.log, nodes);

		next();

		console.groupEnd();
	}

	function stopped() {
		console.trace('%c' +
			'Test failed: assertion recieved after test stopped with done().'
		);
	}

	function test(name, fn, n, next) {
		console.log('%c' + name, 'color: #6f6f6f; font-weight: 300;');

		var i = 0;
		var eq = equals;

		function assert(expected, value, message) {
			++i;
			return eq.apply(null, arguments);
		}

		fn(assert, function done() {
			eq = stopped;

			if (n !== undefined && i !== n) {
				console.trace('%c' +
					'Test failed: ' + 
					'expected ' + number + ' assertions, ' +
					'received ' + i,
					'color: #ee8833; font-weight: 700;'
				);
			}
			else {
				console.log('...passed');
			}

			next();
		});
	}

	window.group = group;
})(this);
