/**
last(array)
Returns the last value in an array.
**/

export default function last(array) {
    if (typeof array.length === 'number') {
        return array[array.length - 1];
    }
}
