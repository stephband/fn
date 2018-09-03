/*
has(key, value, object)

Returns `true` if `object[key]` is strictly equal to `value`.
*/

export default function has(key, value, object) {
    return object[key] === value;
}
