/**
toLevel(dB)

Converts a dB value relative to unity (dBFS) to unit value.
**/

export default function toGain(n) {
    return Math.pow(2, n / 6);
}