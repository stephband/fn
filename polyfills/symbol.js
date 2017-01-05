// (C) WebReflection Mit Style License

if (!window.Symbol) {
	(function(window){
		"use strict";

		var O = Object.prototype;
		var defineProperty = Object.defineProperty;
		var prefix = '__symbol-' + Math.ceil(Math.random() * 1000000000) + '-';
		var id = 0;

	    function Symbol(description) {
	    	var symbol = prefix + id++;

			this._symbol = symbol;

			// Set up Object prototype to handle setting this symbol
			defineProperty(O, symbol, {
				enumerable: false,
				configurable: false,
				set: function (value) {
					defineProperty(this, symbol, {
						enumerable: false,
						configurable: true,
						writable: true,
						value: value
					});
				}
	        });
		}

		defineProperty(Symbol.prototype, 'toString', {
			enumerable: false,
			configurable: false,
			writable: false,
			value: function toString() {
				return this._symbol;
			}
		});

		window.Symbol = Symbol;
	}(this));
}