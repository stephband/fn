/*
parseInt(string)
Parse to integer without having to worry about the radix parameter,
making it suitable, for example, to use in `array.map(parseInt)`.
*/

export default function parseInt(object) {
    return object === undefined ?
        undefined :
        parseInt(object, 10);
}
