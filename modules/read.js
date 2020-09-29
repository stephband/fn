
import curry from './curry.js';
import { exec } from './exec.js';

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot parse string "' + string + '"');
}

/**
read(regex, reducers, accumulator, string)
Parse `string` with `regex`, calling a function in `reducers` to modify
and return `accumulator` when a match is found.

Reducers may also define a function `'catch'`, which is called when a match
has not been made (where `'catch'` is not defined an error is thrown).

```js
const parseGreeting = read(/hello|goodbye/, {
    hello: (acc, tokens) => {
        return { type: 'introduction' };
    },

    goodbye: (acc, tokens) => {
        return { type: 'farewell' };
    }
}, null);

const value = parseGreeting('hello grandma');   // { text: 'introduction' }
```
*/

function evaluate(reducers, acc, tokens) {
    const reducer = reducers[tokens[0]];
    return reducer ? reducer(acc, tokens) : acc ;
}

function read(regexp, reducers, acc, string) {
    const output = exec(regex, (tokens) => evaluate(reducers, acc, tokens), string);

    // If tokens is undefined exec has failed apply regex to string
    return output === undefined ?
        // If there is a catch function, call it, otherwise error out
        reducers.catch ?
            reducers.catch(acc, string) :
            error(regex, reducers, string) :

        // Return the accumulator
        output ;
}

export default curry(read, true);