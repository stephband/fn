import denormalise from './denormalise.js';

export default function rangeLog(min, max, n) {
    return denormalise(min, max, Math.log(n / min) / Math.log(max / min));
};
