
import exec from './exec.js';

function reduce(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the close fn
    if (reducers.close) {
        acc = reducers.close(acc, tokens);
    }

    return acc;
}

function reportError(regex, string) {
    throw new Error('Cannot capture ' + regex + ' of "' + string + '"');
}

export default function capture(regex, reducers, acc, string) {
    return exec(regex, (tokens) => reduce(reducers, acc, tokens), reducers.catch ? () => reducers.catch(acc) : reportError, string) ;
}
