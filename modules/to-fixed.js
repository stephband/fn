/**
toFixed(number)
*/

import curry from './curry.js';

const N     = Number.prototype;
const isNaN = Number.isNaN;

export function toFixed(n, value) {
    if (isNaN(value)) {
        return '';
        // throw new Error('Fn.toFixed does not accept NaN.');
    }

    return N.toFixed.call(value, n);
}

export default curry(toFixed, true);
