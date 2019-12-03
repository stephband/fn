/*
argument(n)

Returns a function that returns its nth argument when called.
*/

export default function argument(n) {
    return function argument() {
        return arguments[n];
    }
}
