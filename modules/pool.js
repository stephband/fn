
const assign = Object.assign;

/**
Pool(constructor, reset, isIdle)
**/

export default function Pool(Constructor, reset, isIdle) {
	const pool = [];

	return assign(function Pooled() {
		var object = pool.find(isIdle);

		if (object) {
			reset.apply(object, arguments);
			return object;
		}

		object = new Constructor(...arguments);
		pool.push(object);
		return object;
	}, Constructor, { pool });
}
