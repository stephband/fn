/**
wrap(min, max, n)
**/

import mod   from './mod.js';

export default function wrap(min, max, n) {
    return min + mod(max - min, n - min);
}
