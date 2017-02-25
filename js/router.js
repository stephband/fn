(function(window) {
	"use strict";
	
	var assign = Object.assign;
	var Fn     = window.Fn;
	var Stream = Fn.Stream;
	var debug  = true;

	// Mixin for router objects
	var mixin = {};

	function routesReducer(routes) {
		return function(data, path) {
			var n = -1;
			var l = routes.length;
			var route, captures;

			while (++n < l) {
				route    = routes[n];
				captures = route[0].exec(path);

				if (captures) {
					//route[0].lastString = path;
					//route[0].lastMatch = args[0];
					return route[1].apply(null, captures.slice(1));
				}
			}

			// For unknown paths, return the current state
			return data;
		};
	}

	function Router(reducer, data) {
		var router = assign(Stream.of(), mixin).scan(reducer, data);
		var stop   = router.stop;

		function popstate() {
			router.push(location.pathname);
		}

		function click(e) {
			// Already handled
			if (e.defaultPrevented) { return; }
		
			// Not primary button
			if (!dom.isPrimaryButton(e)) { return; }
		
			var node = dom.closest('a[href]', e.target);

			// Not in a link
			if (!node) { return; }

			// A download
			if (dom.attribute('download', node)) { return; }

			// Another window or frame
			if (node.target && node.target !== '_self') { return; }

			// An external site
			if (location.hostname !== node.hostname) { return; }

			// Only the hash changed
			if (node.href !== location.href && node.href.split('#')[0] === location.href.split('#')) { return; }

			// From: https://github.com/riot/route/blob/master/src/index.js :: click()
			//    || base[0] !== '#' && getPathFromRoot(el.href).indexOf(base) !== 0 // outside of base
			//    || base[0] === '#' && el.href.split(base)[0] !== loc.href.split(base)[0] // outside of #base
			//    || !go(getPathFromBase(el.href), el.title || doc.title) // route not found

			var routed = router.push(node.pathname);

			// If route is accepted, prevent default browser navigation
			if (routed) { e.preventDefault(); }
		}

		router.stop = function() {
			window.removeEventListener('popstate', popstate);
			document.removeEventListener('click', click);
			stop.apply(router, arguments);
		};

		window.addEventListener('popstate', popstate);
		document.addEventListener('click', click);

		return router;
	}

	Object.defineProperties(Router, {
		// When routes change should the browser scroll the page?
		scrolling: {
			set: function(bool) {
				if ('scrollRestoration' in history) {
					history.scrollRestoration = bool ? 'auto' : 'manual' ;
				}
				else {
					// TODO: Support scroll override in IE and Safari and
					// anything else that dont have no scrollRestoration.
				}
			},
			
			get: function() {
				return history.scrollRestoration === 'manual';
			}
		}
	});

	Router.scrolling = false;

	window.Router         = Router;
	Router.routesReducer  = routesReducer;
})(this);
