(function(window) {
	"use strict";

	var debug = true;

	// Import

	var Fn             = window.Fn;
	var Node           = window.Node;
	var SVGElement     = window.SVGElement;
	var Stream         = Fn.Stream;
	var BufferStream   = Fn.BufferStream;


	// Var

	var A = Array.prototype;
	var rspaces = /\s+/;


	// Utility functions

	var assign         = Object.assign;
	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}

	function isDefined(val) { return val !== undefined && val !== null; }

	function all(fn) {
		return function(node, collection) {
			var n = -1;
			var length = collection.length;
			while (++n < length) { fn(node, collection[n]); }
			return node;
		};
	}


	// TokenList constructor to emulate classList property. The get fn should
	// take the arguments (node), and return a string of tokens. The set fn
	// should take the arguments (node, string).

	function TokenList(node, get, set) {
		this.node = node;
		this.get = get;
		this.set = set;
	}

	TokenList.prototype = {
		add: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;

			while (n--) {
				if (array.indexOf(arguments[n]) === -1) {
					array.push(arguments[n]);
				}
			}

			this.set(this.node, array.join(' '));
		},

		remove: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		}
	};


	// DOM Nodes

	function create(name) {
		// create('comment', 'Text');
		if (name === 'comment' || name === '!') {
			return document.createComment(arguments[1] || '');
		}

		// create('text', 'Text')
		if (name === 'text') {
			return document.createTextNode(arguments[1] || '');
		}

		// create('fragment')
		if (name === 'fragment') {
			return document.createDocumentFragment();
		}

		// create('div', 'HTML')
		var node = document.createElement(name);
		if (arguments[1]) { node.innerHTML = arguments[1]; }
		return node;
	}

	function clone(node) {
		return node.cloneNode(true);
	}

	function isElementNode(node) {
		return node.nodeType === 1;
	}

	function isTextNode(node) {
		return node.nodeType === 3;
	}

	function isCommentNode(node) {
		return node.nodeType === 8;
	}

	function isFragmentNode(node) {
		return node.nodeType === 11;
	}

	function tag(node) {
		return node.tagName.toLowerCase();
	}

	function getClasses(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}

	function getClass(node) {
		// node.className is an object in SVG. getAttribute
		// is more consistent, if a tad slower.
		return node.getAttribute('class');
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function getStyle(name, node) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
	}


	// DOM Traversal

	function find(selector, node) {
		node = node || document;
		return A.slice.apply(node.querySelectorAll(selector));
	}

	function findOne(selector, node) {
		node = node || document;
		return node.querySelector(selector);
	}

	function matches(selector, node) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			// Fall back to simple tag name matching.
			node.tagName.toLowerCase() === selector ;
	}

	function closest(selector, node, root) {
		if (!node || node === document || node === root || node.nodeType === 11) { return; }

		// SVG <use> elements store their DOM reference in
		// .correspondingUseElement.
		node = node.correspondingUseElement || node ;

		return matches(selector, node) ?
			 node :
			 closest(selector, node.parentNode, root) ;
	}


	// DOM Mutation

	function appendChild(node, child) {
		node.appendChild(child);
	}

	function append(node, child) {
		if (child instanceof Node || child instanceof SVGElement) {
			return appendChild(node, child);
		}

		if (child.length) {
			Array.prototype.forEach.call(child, function(child) {
				appendChild(node, child);
			});
		}
	}

	function appendTo(node, child) {
		appendChild(node, child);
	}

	function html(html, node) {
		node.innerHTML = html;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function remove(node) {
		if (node instanceof Node || node instanceof SVGElement) {
			removeNode(node);
		}
		else {
			A.forEach.call(node, removeNode);
		}
	}

	function insertBefore(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function insertAfter(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}


	// DOM Events

	var eventOptions = { bubbles: true };

	function createEvent(type) {
		return new CustomEvent(type, eventOptions);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(selector, e.target, e.currentTarget);

			if (!node) { return; }

			e.delegateTarget = node;
			return fn(e);
		};
	}

	function isPrimaryButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function trigger(type, node) {
		// Don't cache events. It prevents you from triggering an an event of a
		// type given type from inside the handler of another event of that type.
		node.dispatchEvent(createEvent(type));
	}

	function on(node, type, selector, fn) {
		if (typeof arguments[arguments.length - 1] === 'function') {
			return;
		}

		// var stream = new EventStream(function setup(push) {
		// 	node.addEventListener(type, push);
		// 	return function teardown() {
		// 		node.removeEventListener(type, push);
		// 	};
		// });

		// Return stream
		var stream = new EventStream();
		node.addEventListener(type, stream.push);
		return selector ?
			stream.delegate(selector) :
			stream ;
	}

	function off(node, type, fn) {
		node.removeEventListener(type, fn);
	}


	// DOM Fragments and Templates

	var templates = {};

	function fragmentFromChildren(node) {
		var children = slice(node.childNodes);
		var fragment = create('fragment');
		return append(fragment, children);
	}

	function fragmentFromContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('DOM: element id="' + id + '" is not in the DOM.') }

		var tag = DOM.tag(node);
		if (tag !== 'template' && tag !== 'script') { return; }

		if (node.content) {
			return fragmentFromContent(node);
		}
		else {
			// In browsers where templates are not inert, ids used inside them
			// conflict with ids in any rendered result. To go some way to
			// tackling this, remove the node from the DOM.
			remove(node);
			return fragmentFromContent(node);
		}
	}

	function cloneTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}

	function registerTemplate(id, node) {
		templates[id] = node;
	}


	// DOM Feature tests

	var testEvent = createEvent('featuretest');

	function testTemplate() {
		// Older browsers don't know about the content property of templates.
		return 'content' in document.createElement('template');
	}

	function testEventDispatchOnDisabled() {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		var input = document.createElement('input');
		var result = false;

		appendChild(document.body, input);
		input.disabled = true;
		input.addEventListener('featuretest', function(e) { result = true; });
		input.dispatchEvent(testEvent);
		removeNode(input);

		return result;
	}


	// NodeStream

	var findFn = Fn.curry(find);

	function NodeStream(array) {
		if (!this || !NodeStream.prototype.isPrototypeOf(this)) {
			return new NodeStream(array);
		}

		Stream.call(this, array);
	}

	NodeStream.prototype = Object.create(Stream.prototype);

	assign(NodeStream.prototype, {
		clone: function() {
			return this.map(DOM.clone);
		},

		closest: function(selector) {
			return this.map(DOM.closest(selector));
		},

		empty: function() {
			return this.tap(DOM.empty);
		},

		find: function(selector) {
			// This should return a BufferStream
			return this.map(findFn(selector));
		},

		html: function(string) {
			return this.tap(DOM.html(string));
		},

		insertAfter: function(node) {
			return this.tap(DOM.insertAfter(node));
		},

		insertBefore: function(node) {
			return this.tap(DOM.insertBefore(node));
		},

		matches: function(selector) {
			return this.filter(DOM.matches(selector));
		},

		remove: function() {
			return this.tap(DOM.remove);
		},

		event: function(type, selector) {
			var source = this;
			var stream = new Stream(source.next, noop);

			// Transmit push event, but make stream unpushable.
			this.on('push', stream.push);
			delete stream.push;

			// Return a stream of event streams
			return stream
			.map(function(node) {
				return new EventStream(node, type, selector);
			});
		},

		trigger: function(type) {
			return this.tap(DOM.trigger(type));
		},

		addClass: function(classes) {
			return this.tap(function(node) {
				getClasses(node).add(classes);
			});
		},

		removeClass: function() {
			return this.tap(function(node) {
				getClasses(node).remove(classes);
			});
		},

		isComment: function() {
			return this.filter(DOM.isCommentNode);
		},

		isElement: function() {
			return this.filter(DOM.isElementNode);
		},

		isFragment: function() {
			return this.filter(DOM.isFragmentNode);
		},

		isText: function() {
			return this.filter(DOM.isTextNode);
		}
	});


	// EventStream

	function EventStream(node, type, selector) {
		if (!this || !EventStream.prototype.isPrototypeOf(this)) {
			return new EventStream(node, type, selector);
		}

		if (debug) { console.log('EventStream(node:', node, ', type:', type, ', selector:', selector, ');'); }

		// This is much shenanigans. Surely it can be simpler? Would help if
		// it were possible to push without exposing .push() method...

		var stream = this;
		var buffer = [] ;

		function next() {
			return buffer.shift();
		}

		Stream.call(this, next, noop);

		var push = this.push;
		// Make stream non-pushable
		delete this.push;

		var pushEvent = selector ? function(e) {
			var delegateTarget = closest(selector, e.target, e.currentTarget);
			if (!delegateTarget) { return; }
			e.delegateTarget = delegateTarget;
			buffer.push(e);
			push();
		} : function(e) {
			buffer.push(e);
			push();
		} ;

		node.addEventListener(type, pushEvent);

		this.on('end', function end() {
			node.removeEventListener(type, pushEvent);
		});
	}

	EventStream.prototype = Object.create(Stream.prototype);

	assign(EventStream.prototype, {
		create: function(next) {
			var stream = Object.create(this);
			stream.next = next;
			return stream;
		},

		preventDefault: function() {
			return this.tap('preventDefault');
		},

		closest: function(selector) {
			return this.map(function(e) {
				return closest(selector, e.target);
			});
		},

		delegate: function(selector) {
			return this.filter(function(e) {
				var node = closest(selector, e.target, e.currentTarget);

				if (!node) { return false; }

				e.delegateTarget = node;
				return true;
			});
		}
	});



	// Units

	var rem = /(\d*\.?\d+)r?em/;
	var rpercent = /(\d*\.?\d+)%/;

	var fontSize;

	var valueTypes = {
		number: function(n) { return n; },

		string: function(string) {
			var data, n;

			data = rem.exec(string);
			if (data) {
				n = parseFloat(data[1]);
				return getFontSize() * n;
			}

			data = rpercent.exec(string);
			if (data) {
				n = parseFloat(data[1]) / 100;
				return width * n;
			}

			throw new Error('[window.breakpoint] \'' + string + '\' cannot be parsed as rem, em or %.');
		}
	};

	function valueToPx(value) {
		return valueTypes[typeof value](value);
	};

	function getFontSize() {
		return fontSize ||
			(fontSize = parseFloat(getStyle("font-size", document.documentElement), 10));
	}

	// DOM

	function DOM(selector, node) {
		var nodes = typeof selector === "string" ?
				A.slice.call(find(selector, node || document)) :
			Node.prototype.isPrototypeOf(selector) ?
				[selector] :
			A.slice.call(selector) ;

		return new NodeStream(nodes);
	}

	assign(DOM, {
		// DOM Nodes
		create:         create,
		clone:          clone,
		tag:            tag,
		classes:        getClasses,
		style:          getStyle,
		getClass:       getClass,
		setClass:       setClass,
		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode,
		valueToPx:      valueToPx,

		// DOM Traversal
		find:           find,
		findOne:        findOne,
		matches:        Fn.curry(matches),
		closest:        Fn.curry(closest),

		// DOM Mutation
		append:         Fn.curry(append),
		html:           Fn.curry(html),
		insertBefore:   Fn.curry(insertBefore),
		insertAfter:    Fn.curry(insertAfter),
		empty:          empty,
		remove:         remove,

		// DOM Fragments and Templates
		template: function(id, node) {
			if (node) { registerTemplate(id, node); }
			else { return cloneTemplate(id); }
		},

		fragmentFromTemplate: cloneTemplate,
		fragmentFromContent: fragmentFromContent,

		// DOM Events
		on:             on,
		off:            off,
		trigger:        Fn.curry(trigger),
		delegate:       delegate,
		isPrimaryButton: isPrimaryButton,

		// Streams
		NodeStream:     NodeStream,
		EventStream:    EventStream,

		features: {
			template: testTemplate(),
			inputEventsOnDisabled: testEventDispatchOnDisabled()
		}
	});


	// Export

	window.DOM = DOM;
})(this);
