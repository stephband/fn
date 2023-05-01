/**
isDefined(value)
Check for defined `value`. where `value` is `undefined`, `NaN` or `null`,
returns `false`, otherwise `true`.
*/


export default function isDefined(value) {
    // !!value is a fast out for non-zero numbers, non-empty strings
    // and other objects, the rest checks for 0, '', etc.
    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
}
