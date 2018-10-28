
export default function exec(regex, fn, string) {
    let data;

    // If path is a regex result, get rest of string from latest index
    if (string.input !== undefined && string.index !== undefined) {
        data   = string;
        string = data.input.slice(string.index + string[0].length + (string.consumed || 0));
    }

    const tokens = regex.exec(string);

    if (!tokens) {
        return;
        //throw new Error('Cannot capture using ' + regex + ' in "' + string + '"');
    }

    const output = fn(tokens);

    // Update outer result's index
    if (data) {
        data.consumed = tokens.index + tokens[0].length + (tokens.consumed || 0);
    }

    return output;
}
