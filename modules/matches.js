/**
matches(selector, object)

For filtering and pattern matching. Returns true where all the properties
of `selector` object are strictly equal to the same properties of `object`.
Note that `object` may have more properties than `selector`.

```
const vegetarian = menu.filter(matches({ vegetable: true }));
```
**/

import curry from './curry.js';

export function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

export default curry(matches, true);
