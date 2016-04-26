(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Stream = Fn.Stream;
	var BufferStream = Fn.BufferStream;
	var assign = Object.assign;
	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);
	var dom = {};
	var rspaces = /\s+/;
	var Stream = Fn.Stream;

	// Utility functions

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

	// Selection, traversal and mutation

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

	function getClassList(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}

	function getStyle(node, name) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
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

	function tagName(node) {
		return node.tagName.toLowerCase();
	}

	function createNode(name) {
		// create('comment', 'Text');
		if (name === 'comment' || name === '!') {
			return document.createComment(arguments[1]);
		}

		// create('text', 'Text')
		if (name === 'text') {
			return document.createTextNode(arguments[1]);
		}

		// create('fragment')
		if (name === 'fragment') {
			return document.createDocumentFragment();
		}

		// create('div', 'HTML')
		var node = document.createElement(name);
		node.innerHTML = arguments[1];
		return node;
	}

	function append(node1, node2) {
		node1.appendChild(node2);
		return node1;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertBefore(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function insertAfter(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	function NodeStream(array) {
		if (!this || !NodeStream.prototype.isPrototypeOf(this)) {
			return new NodeStream(array);
		}

		ReadStream.call(this, array);
	}

	setPrototypeOf(assign(NodeStream.prototype, {
		append: function(collection) {
			return this.map(dom.append(collection));
		},

		html: function(string) {
			return this.map(dom.html(string));
		},
	}, Stream.prototype);

	function query(selector, node) {
		node = node || document;
		return NodeStream(node.querySelectorAll(selector));
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

	assign(dom, {
		query:     query,
		tag:       tagName,
		create:    createNode,

		append: Fn.curry(function(children, node) {
			if (Node.prototype.isPrototypeOf(children)) {
				node.appendChild(children);
			}
			else {
				Array.prototype.forEach.call(children, function(child) {
					node.appendChild(child);
				});
			}

			return node;
		}),

		html: Fn.curry(function(html, node) {
			node.innerHTML = html;
			return node;
		}),

		after:     insertAfter,
		before:    insertBefore,
		empty:     empty,
		remove:    function(node) {
			if (Node.prototype.isPrototypeOf(node)) {
				remove(node);
				return;
			}

			Array.prototype.forEach.call(node, remove);
		},
		closest:   Fn.curry(closest),
		matches:   Fn.curry(matches),
		classes:   getClassList,
		style:     getStyle,
		getClass:  getClass,
		setClass:  setClass,
		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode
	});


	// Templates

	var templates = {};

	function fragmentFromChildren(node) {
		var children = slice(node.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce(children, append, fragment);
	}

	function fragmentFromContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('dom: element id="' + id + '" is not in the DOM.') }

		var tag = dom.tag(node);
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

	assign(dom, {
		template: function(id, node) {
			if (node) { registerTemplate(id, node); }
			else { return cloneTemplate(id); }
		},

		fragmentFromTemplate: cloneTemplate,
		fragmentFromContent: fragmentFromContent
	});


	// Events

	var eventOptions = { bubbles: true };

	function createEvent(type) {
		return new CustomEvent(type, eventOptions);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(e.target, selector, e.currentTarget);

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

	function trigger(node, type) {
		// Don't cache events. It prevents you from triggering an an event of a
		// type given type from inside the handler of another event of that type.
		node.dispatchEvent(createEvent(type));
	}

	function EventStream(node, type, selector) {
		if (!this || !EventStream.prototype.isPrototypeOf(this)) {
			return new EventStream(node, type, selector);
		}

		// This is much shenanigans. Surely it can be simpler? Would help if
		// it were possible to push withoutexposing .push() method...

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

	Object.setPrototypeOf(assign(EventStream.prototype, {
		create: function(next) {
			var stream = Object.create(this);
			stream.next = next;
			return stream;
		},

		preventDefault: function() {
			return this.run('preventDefault');
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
	}), Stream.prototype);

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

	assign(dom, {
		on:       on,
		off:      off,
		trigger:  trigger,
		delegate: delegate,
		isPrimaryButton: isPrimaryButton,
		EventStream: EventStream
	});


	// Feature tests

	var testEvent = new CustomEvent('featuretest', { bubbles: true });

	function testTemplate() {
		// Older browsers don't know about the content property of templates.
		return 'content' in document.createElement('template');
	}

	function testEventDispatchOnDisabled() {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		var input = document.createElement('input');
		var result = false;

		append(document.body, input);
		input.disabled = true;
		input.addEventListener('featuretest', function(e) { result = true; });
		input.dispatchEvent(testEvent);
		dom.remove(input);

		return result;
	}

	dom.features = {
		template: testTemplate(),
		inputEventsOnDisabled: testEventDispatchOnDisabled()
	};


	// Export
	window.DOM = dom;
})(this);
