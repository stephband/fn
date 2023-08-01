/**
not(value)
Returns `!value`.
*/

export default function not(b) {
    console.warn('Signature of not() was changed');
    return (a) => a !== b;
}
