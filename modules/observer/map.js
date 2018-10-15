import { Observer } from "./observer.js";
import { observe } from "./observe.js";

const assign = Object.assign;

export function map(fn, array) {
	var subset = Observer([]);

	observe('.', function() {
		var filtered = array.map(fn);
		assign(subset, filtered);
		subset.length = filtered.length;
	}, array);

	return subset;
}
