
export default function exec(regex, fn, string) {
    let data;

    // If path is a regex result, get rest of string from latest index
    if (string.input !== undefined && string.index !== undefined) {
        data   = string;
        string = data.input.slice(
            string.index
            + string[0].length
            + (string.consumed || 0)
        );
    }

    const tokens = regex.exec(string);

    if (!tokens) {
        // Lets be strict about this
        throw new Error('Cannot exec ' + regex + ' on "' + string + '"');
    }

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
