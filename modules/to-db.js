/**
todB(level)
Converts a unit gain to a decibel ratio.
**/

export default function todB(n) {
    return 20 * Math.log10(n);
}
