
// Number.isFinite(n) polyfill

if (!Number.isFinite) {
	if (window.console) { console.log('Polyfill: Number.isFinite()'); }

	(function(window) {
		"use strict";

		Object.defineProperty(Number, 'isFinite', {
			value: function isNaN(value) {
				return value !== Infinity && value !== -Infinity && !Number.isNaN(value);
			},

			configurable: true,
			enumerable: false,
			writable: true
		});
	})(this);
}
