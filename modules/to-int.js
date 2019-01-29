export default function toInt(object) {
    return object === undefined ?
        undefined :
        parseInt(object, 10);
}
