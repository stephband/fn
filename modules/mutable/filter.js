import { Mutable, observe } from "./mutable.js";

const assign = Object.assign;

export function filter(fn, array) {
	var subset = Mutable([]);

	observe(array, '', function() {
		var filtered = array.filter(fn);
		assign(subset, filtered);
		subset.length = filtered.length;
	});

	return subset;
}
