/**
toClass(object)
*/

const toString = Object.prototype.toString;

export default function toClass(object) {
    return toString.apply(object).slice(8, -1);
}
