/**
remove(array, value)
Remove `value` from `array`. Where `value` is not in `array`, does nothing.
**/

export default function remove(array, value) {
    if (array.remove) { array.remove(value); }
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
    return value;
}
