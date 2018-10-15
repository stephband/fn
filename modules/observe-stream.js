
import Stream  from './stream.js';
import noop    from './noop.js';
import { Observer } from './observer/observer.js';
import { observe } from './observer/observe.js';
import { setPath } from './paths.js';

function ObserveSource(end, object, path) {
	this.observable = Observer(object);
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

		source.unobserve = observe(path, update, object);
		return source;
	});
}
