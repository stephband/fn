
import Stream  from './stream.js';
import curry   from './curry.js';
import noop    from './noop.js';
import { setPath } from './paths.js';
import '../js/observable.js';
const Observable = window.Observable;

function ObserveSource(end, object, path) {
	this.observable = Observable(object);
	this.path       = path;
	this.end        = end;
}

ObserveSource.prototype = {
	shift: function() {
		var value = this.value;
		this.value = undefined;
		return value;
	},

	push: function() {
		setPath(this.path, this.observable, arguments[arguments.length - 1]);
	},

	stop: function() {
		this.unobserve();
		this.end();
	},

	unobserve: noop
};

export default function(path, object) {
	return new Stream(function setup(notify, stop) {
		var source = new ObserveSource(stop, object, path);

		function update(v) {
			source.value = v === undefined ? null : v ;
			notify('push');
		}

		source.unobserve = Observable.observe(object, path, update);
		return source;
	});
};
