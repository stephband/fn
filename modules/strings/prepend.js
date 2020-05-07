
import curry from '../curry.js';

/**
prepend(string1, string2)
Returns `str1 + str2`.
**/

export function prepend(string1, string2) {
    return '' + string1 + string2;
}

export default curry(prepend);
