
function parse(regex, fns, endregex) {
    return function parse(output, string) {
        var data = typeof string === 'string' ? { string: string } : string ;
        var result = regex.exec(data.string);

        if (!result) {
            throw new Error('Sparky: unable to parse "' + string + '"');
        }

        data.string = data.string.slice(result.index + result[0].length);

        var n = -1;
        while (++n) {
            if (result[n] && fns[n]) {
                output = fns[n](output, result[n], data);
            }
        }

        if (endregex) {
            result = endregex.exec(string);

            if (!result) {
                throw new Error('Sparky: unable to parse "' + string + '"');
            }
        }

        return output;
    };
}

                 //              null   true   false   number                                     "string"                   'string'                   array        function(args)   string
var parseParam = parse(/^\s*(?:(null)|(true)|(false)|(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\[[^\]]*\])|(\w+)\(([^)]+)\)|([^,\s]+))\s*(?:,|$)/, {
    // null
    1: function(params) { params.push(null); return params; },

    // true
    2: function(params) { params.push(true); return params; },

    // false
    3: function(params) { params.push(false); return params; },

    // number
    4: function(params, value) { params.push(parseFloat(value)); return params; },

    // "string"
    5: function(params, value) { params.push(value); return params; },

    // 'string'
    6: function(params, value) { params.push(value); return params; },

    // array
    7: function(params, value) {
        value = JSON.parse(value.replace(rsinglequotes, '"'));
        params.push(value);
        return params;
    },

    // function
    8: function(params, value) {
        value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
        params.push(value);
        return params;
    },

    // string
    10: function(params, value) { params.push(value); return params; },

    // Comma terminator - more params to come
    11: function(params, value, string) {
        return parseParam(params, string);
    }
});

var parseFn = parse(/^(name)(:)/, {
    1: function(fn, name) {
        return transforms[name];
    },

    2: function(fn, value, string) {
        var params = parseParam([], string);
        return fn.apply(null, params);
    }
});

var parseFns = parse(/^\|/, {
    0: function(data, name) {
        var fn = parseFn(null, string);
        data.push(fn);
        return parseFns(data, string);
    }
});

var parseTag = parse(/\{\[(path.to.thing)/, {
    1: function(data, path) {
        data.path = path;
        var fns = parseFns([], string);
        data.fn = pipe.apply(null, fns);
        return data;
    }
}, /\]\}/);
