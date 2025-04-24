const S = String.prototype;

/**
byAlphabet(a, b)
Compares `a` against `b` alphabetically using the current locale alphabet.
**/

export default function byAlphabet(a, b) {
    return S.localeCompare.call(a, b);
}
