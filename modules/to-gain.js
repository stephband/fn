/**
toLevel(dB)
Converts a dB ratio to a unit gain.
**/

export default function toGain(n) {
    return Math.pow(10, n / 20);
}
