/**
todB(level)

Converts a value to decibels relative to unity (dBFS).
**/

// A bit disturbingly, a correction factor is needed to make todB() and
// to toLevel() reciprocate more accurately. This is quite a lot to be off
// by... Todo: investigate?
const dBCorrectionFactor = (60 / 60.205999132796244);

export default function todB(n) {
    return 20 * Math.log10(n) * dBCorrectionFactor;
}
