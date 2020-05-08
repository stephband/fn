/**
append(str2, str1)
Returns `str1 + str2`.
**/

import curry from '../curry.js';

export function append(string2, string1) {
    return '' + string1 + string2;
}

export default curry(append);
