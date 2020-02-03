
import curry from '../curry.js';

export function prepend(string1, string2) {
    return '' + string1 + string2;
}

export default curry(prepend);
