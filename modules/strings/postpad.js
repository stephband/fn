
import curry from '../curry.js';

/**
postpad(chars, n, string)
Pads `string` to `n` characters by appending `chars`.
**/

export function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

export default curry(postpad);
