/**
exec(regex, fn, string)

Calls `fn` with the result of `regex.exec(string)` if that result is not null,
and returns the resulting value.
*/

import curry from './curry.js';

export function exec(regex, fn, string) {
    let data;

    // If string looks like a regex result, get rest of string
    // from latest index
    if (typeof string !== 'string' && string.input !== undefined && string.index !== undefined) {
        data = string;
        string = data.input.slice(
            string.index
            + string[0].length
            + (string.consumed || 0)
        );
    }

    // Look for tokens
    const tokens = regex.exec(string);
    if (!tokens) { return; }

    const output = fn(tokens);

    // If we have a parent tokens object update its consumed count
    if (data) {
        data.consumed = (data.consumed || 0)
            + tokens.index
            + tokens[0].length
            + (tokens.consumed || 0) ;
    }

    return output;
}

export default curry(exec, true);
