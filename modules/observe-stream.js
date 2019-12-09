
import Stream  from './stream.js';
import noop    from './noop.js';
import { Observer } from './observer/observer.js';
import { observe } from './observer/observe.js';
//import { setPath } from './paths.js';

function ObserveSource(notify, stop, args) {
	this.observer = Observer(args[1]);
	this.path     = args[0];
	this.object   = args[1];
	this.end      = stop;

	this.unobserve = observe(this.path, (value) => {
		this.value = value === undefined ? null : value ;
		notify('push');
	}, this.object);
}

ObserveSource.prototype = {
	shift: function() {
		var value = this.value;
		this.value = undefined;
		return value;
	},

// Doesnt seem like this is at all necessary ??
// To be able to update properties by pushing ??
//	push: function() {
//		setPath(this.path, this.observer, arguments[arguments.length - 1]);
//	},

	stop: function() {
		this.unobserve();
		this.end();
	},

	unobserve: noop
};

export default function Observable(path, object) {
	return new Stream(ObserveSource, arguments);
}

Stream.fromProperty = Observable;
