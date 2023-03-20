/**
remove(array, value)
Remove `value` from `array`. Where `value` is not in `array`, does nothing.
**/

import curry from './curry.js';

export function remove(array, value) {
    if (array.remove) { array.remove(value); }

    let i;
    while ((i = array.indexOf(value)) !== -1) {
        array.splice(i, 1);
    }

    return array;
}

export default curry(remove, true);
