import { Observer } from "./observer.js";
import { observe } from "./observe.js";

const assign = Object.assign;

export function filter(fn, array) {
	var subset = Observer([]);

	observe('.', function() {
		var filtered = array.filter(fn);
		assign(subset, filtered);
		subset.length = filtered.length;
	}, array);

	return subset;
}
