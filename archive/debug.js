
import { $observer } from './observer.js';

// -----------------------------------------
// Pretty print Observer Proxies in devtools (omits all the proxy
// [[target]] nonsense).

function printObject(object) {
	return '{' + Object.keys(object)
	.map(function(key) {
		return key + ': ' + (
			(object[key] && typeof object[key] === 'object') ?
				Array.isArray(object[key]) ?
					'[…]' :
				'{…}' :
			object[key]
		);
	})
	.join(', ') + '}';
}

window.devtoolsFormatters = [{
	header: function(object, config) {
		if (config && config.observableProxyFormatter) {
			return ['div', {}, config.key + ': ' + printObject(object)];
		}

		// Detect observable
		if (!object[$observer] || object[$observer] !== object) {
			return null;
		}

		return ["div", { style: 'color: #60acc5;' }, 'Observer Proxy ' + printObject(object)];
	},

	hasBody: function(){
		return true;
	},

	body: function(object, config) {
		var level = config ? config.level : 1 ;

		return ["div", { style: 'color: #60acc5; margin-left: ' + (14 * level) + 'px;'}].concat(Object.keys(object).map(function(key){
			var child;
			var value = object[key];

			return (value && typeof value === "object") ?
				["div", {}, ["object", {
					object: value,
					config: {
						level: level + 1,
						key: key,
						observableProxyFormatter: true,
					}
				}]] :
				['div', { style: 'margin-left: 14px' }, (key + ": " + value)] ;
		}));
	}
}];
