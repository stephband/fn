import curry   from '../modules/curry.js';
import nothing from '../modules/nothing.js';

function distribute(fns, object, data) {
    let n = -1;

    while (++n < data.length) {
        if (data[n] !== undefined && fns[n]) {
            object = fns[n](object, data);
        }
    }

    return object;
}

export default function exec(regex, fns, output, string) {
    let data;

    if (typeof string !== 'string') {
        data   = string;
        string = data.input.slice(data.index + data[0].length);
    }

    const result = regex.exec(string);

    if (!result) { return output; }

    output = distribute(fns, output, result);

    // Call the end fn
    if (fns.end) {
        output = fns.end(output, result);
    }

    // Update outer result's index
    if (data) {
        data.index += result.index + result[0].length;
    }

    return output;
}
