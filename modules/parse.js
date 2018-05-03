
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

export default curry(function parse(regex, fns, output, string) {
    var data;

    if (typeof string !== 'string') {
        data   = string;
        string = data.input.slice(data.index + data[0].length);
    }

    var result = regex.exec(string);

    if (!result) {
        throw new Error('Sparky: unable to parse "' + string + '" with ' + regex);
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
