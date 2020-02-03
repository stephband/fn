/*
.append(str2, str1)

Returns `str1 + str2` as string.
*/

import curry from '../curry.js';

export function append(string1, string2) {
    return '' + string2 + string1;
}

export default curry(append);
