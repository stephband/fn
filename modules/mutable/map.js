import { Mutable, observe } from "./mutable.js";

const assign = Object.assign;

export function map(fn, array) {
	var subset = Mutable([]);

	observe(array, '', function(observable) {
		var filtered = array.map(fn);
		assign(subset, filtered);
		subset.length = filtered.length;
	});

	return subset;
}
