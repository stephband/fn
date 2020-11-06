/**
wrap(min, max, n)
**/

import curry from '../curry.js';
import { mod } from './mod.js';

export function wrap(min, max, n) {
    return min + mod(max - min, n - min);
}

export default curry(wrap);
