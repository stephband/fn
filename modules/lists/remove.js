/**
remove(array, value)
Remove `value` from `array`. Where `value` is not in `array`, does nothing.
**/

console.trace('Path changed from fn/modules/lists/remove.js to fn/modules/remove.js');

export default function remove(array, value) {
    if (array.remove) { array.remove(value); }

    let i;
    while ((i = array.indexOf(value)) !== -1) {
        array.splice(i, 1);
    }

    return value;
}
