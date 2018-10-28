
import exec from './exec.js';

function reduce(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the close fn
    // This may be deprecated. Warn.
    if (reducers.close) {
        console.warn('Are we keeping the close function, steve?', reducers);
        acc = reducers.close(acc, tokens);
    }

    return acc;
}

export default function capture(regex, reducers, acc, string) {
    const result = exec(regex, (tokens) => {
        return reduce(reducers, acc, tokens);
    }, string);

    if (!result) {
        //throw new Error('Cannot capture using ' + regex + ' in "' + string + '"');
    }

    return acc;
}
