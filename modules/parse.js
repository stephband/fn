
import curry   from '../modules/curry.js';
import nothing from '../modules/nothing.js';

function distribute(fns, object, data) {
    var n = -1;

    while (++n < data.length) {
        if (data[n] !== undefined && fns[n]) {
            object = fns[n](object, data[n], data);
        }
    }

    return object;
}

/*
function parse(regex, fns, acc, path) {
    // If path is a regex result, get path from latest index
    const string = typeof path !== 'string' ?
        path.input.slice(path.index + path[0].length + (path.consumed || 0)) :
        path ;

    const tokens = regex.exec(string);
    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + string + ' : ' + path.input);
    }

    let n = -1;
    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && fns[n]) ? fns[n](acc, tokens) : acc ;
    }

    path.consumed = tokens.index + tokens[0].length + (tokens.consumed || 0);

    return acc;
}
*/

export default curry(function parse(regex, fns, output, string) {
    var data;

    if (typeof string !== 'string') {
        data   = string;
        string = data.input.slice(data.index + data[0].length);
    }

    var result = regex.exec(string);

    if (!result) {
        throw new Error('Unable to parse "' + string + '" with ' + regex);
    }

    output = distribute(fns, output, result);

    // Call the close fn
    if (fns.close) {
        output = fns.close(output, result);
    }

    // Update outer result's index
    if (data) {
        data.index += result.index + result[0].length;
    }

    return output;
});
