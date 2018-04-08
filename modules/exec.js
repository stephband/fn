
var Fn = window.Fn;
var id = Fn.id;

var rpath      = /^\s*([^\s|\]]+)\s*/;
var rtransform = /^\|\s*([^\s:]+)\s*/;

var transforms = {
    args: Fn.args
};

function execLast(regex, fn) {
    // Regexes without the g flag do not start at .lastIndex
    if (!/g/.test(regex.flags)) {
        throw new Error('exec(regex, fn) regex must have g flag ' + regex);
    }

    return function exec(object, data) {
        regex.lastIndex = data.lastIndex || 0;

        var result = regex.exec(data.input);
        if (!result) { return object; }

        result.lastIndex = data.lastIndex + result[0].length;
        object = fn(object, result);
        object = exec(object, result);
        data.lastIndex = result.lastIndex;
        return object;
    };
}

function exec(regex, fn) {
    // Regexes without the g flag do not start at .lastIndex
    if (/g/.test(regex.flags)) {
        throw new Error('exec(regex, fn) regex cannot have g flag ' + regex);
    }

    return function exec(object, data) {
        var string = data.input.slice(data.index + data[0].length);
        var result = regex.exec(string);
        if (!result) { return object; }
        object = fn(object, result);
        object = exec(object, result);
        data.index += result.index + result[0].length;
        return object;
    };
}

function resultToValue(fns) {
    return function(array, result) {
        var n = -1;

        while (++n < result.length) {
            if (fns[n] && result[n] !== undefined) {
                //console.log('param', result[n]);
                array.push(fns[n](result[n]));
                return array;
            }
        }

        return array;
    };
}

//                       null   true   false   number                                     "string"                   'string'                   string
var rparam = /^[:,]\s*(?:(null)|(true)|(false)|(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^,|\]\s]+))\s*/;

var parseParams = exec(rparam, resultToValue({
    1: function() { return null; },
    2: function() { return true; },
    3: function() { return false; },
    4: parseFloat,
    5: id,
    6: id,
    7: id
}));

var parseTransforms = exec(rtransform, function(array, result) {
    //console.log('transform', result);
    // Construct a transform function
    var transform = transforms[result[1]];
    var params    = parseParams([], result);
    array.push(transform.apply(null, params));
    return array;
});

var parseTokens = exec(rpath, function(tokens, data) {
    //console.log('token', data);
    var token = {
        path:       data[1],
        transforms: parseTransforms([], data)
    };

    token.token = (data.input.slice(0, data.index + data[0].length)).trim();

    tokens.push(token);
    return tokens;
});

var rtagopen = /\{\[/;
var rtagclose = /^\]\}/;

var parseTags = exec(rtagopen, function(tokens, data) {
    tokens = parseTokens(tokens, data);
    var string = data.input.slice(data.index + data[0].length);
    var result = rtagclose.exec(string);

    if (!result) {
        throw new Error('Malformed tag ' + data.input);
        return tokens;
    }

    data.index += result.index + result[0].length;

    return tokens;
});

function parse(string) {
    //console.log('string', string);
    var data = {
        0: '',
        index: 0,
        input: string
    };

    return parseTags([], data);
}
