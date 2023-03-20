
/**
isIterable(value)
**/

export default function isIterable(object) {
    return object && object[Symbol.iterator];
}
