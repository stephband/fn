
export default function isArrayLike(object) {
    return object
        && typeof object === 'object'
        && typeof object.length === 'number';
}
