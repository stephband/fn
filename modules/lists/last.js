/**
last(array)
Gets the last value from an array.
**/

export default function last(array) {
    if (array && typeof array === 'object' && typeof array.length === 'number') {
        return array[array.length - 1];
    }
}
