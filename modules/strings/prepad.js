
import curry from '../curry.js';

/**
prepad(chars, n, string)
Pads `string` to `n` characters by prepending `chars`.
**/

export function prepad(chars, n, value) {
    var string = value + '';
    var i = -1;
    var pre = '';

    while (pre.length < n - string.length) {
        pre += chars[++i % chars.length];
    }

    string = pre + string;
    return string.slice(string.length - n);
}

export default curry(prepad);
