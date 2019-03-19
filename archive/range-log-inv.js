import normalise from './normalise.js';

export default function rangeLogInv(min, max, n) {
    return min * Math.pow(max / min, normalise(min, max, n));
};
