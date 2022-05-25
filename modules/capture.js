
import curry from './curry.js';
import { exec } from './exec.js';

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot parse string "' + (string.length > 128 ? string.length.slice(0, 128) + '…' : string) + '"');
}

function reduce(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the optional done fn
    return reducers.done ? reducers.done(acc, tokens) :
        // Support the old .close() name
        reducers.close ? reducers.close(acc, tokens) :
        // Return the result
        acc ;
}

/**
capture(regex, reducers, accumulator, string)
Parse `string` with `regex`, calling functions in `reducers` to modify
and return `accumulator`.

Reducers is an object of functions keyed by the index of their capturing
group in the regexp result (`0` corresponding to the entire regex match,
the first capturing group being at index `1`). Reducer functions are
called in capture order for all capturing groups that captured something.
Reducers may also define the function 'done', which is called at the end
of every capture. All reducer functions are passed the paremeters
`(accumulator, tokens)`, where `tokens` is the regexp result, and are expected
to return a value that is passed as an accumulator to the next reducer function.

Reducers may also define a function `'catch'`, which is called when a match
has not been made (where `'catch'` is not defined an error is thrown).

```js
const parseValue = capture(/^\s*(-?\d*\.?\d+)(\w+)?\s*$/, {
    // Create a new accumulator object each call
    0: () => ({}),

    1: (acc, tokens) => {
        acc.number = parseFloat(tokens[1]);
        return acc;
    },

    2: (acc, tokens) => {
        acc.unit = tokens[2];
        return acc;
    }
}, null);

const value = parseValue('36rem');    // { number: 36, unit: 'rem' }
```
*/

export function capture(regex, reducers, acc, string) {
    const output = exec(regex, (tokens) => reduce(reducers, acc, tokens), string);

    // If tokens is undefined exec has failed to apply regex to string
    return output === undefined ?
        // If there is a catch function, call it, otherwise error out
        reducers.catch ?
            reducers.catch(acc, string) :
            error(regex, reducers, string) :

        // Return the accumulator
        output ;
}

export default curry(capture, true);
