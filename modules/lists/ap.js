export default function ap(data, fns) {
	var n = -1;
	var fn;
	while (fn = fns[++n]) {
		fn(data);
	}
}
