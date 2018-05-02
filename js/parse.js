
function parse(regex, fns, endregex) {
    return function parse(value, string) {
        var result = regex.exec(string);

        if (!result) {
            throw new Error('Sparky: unable to parse "' + string + '"');
        }

        var n = -1;
        while (++n) {
            if (result[n] && fns[n]) {
                value = fns[n](result[n], value, string);
            }
        }

        if (endregex) {
            result = endregex.exec(string);

            if (!result) {
                throw new Error('Sparky: unable to parse "' + string + '"');
            }
        }

        return value;
    };
}

                 //              null   true   false   number                                     "string"                   'string'                   array        function(args)   string
var parseParam = parse(/^\s*(?:(null)|(true)|(false)|(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\[[^\]]*\])|(\w+)\(([^)]+)\)|([^,\s]+))\s*(?:,|$)/, {
    1: function(params) { params.push(null); return params; },
    2: function(params) { params.push(true); return params; },
    3: function(params) { params.push(false); return params; },
    4: function(params, value) { params.push(parseFloat(value)); return params; },
    5: function(params, value) { params.push(value); return params; },
    6: function(params, value) { params.push(value); return params; },

    7: function(params, value) {
        value = JSON.parse(value.replace(rsinglequotes, '"'));
        params.push(value);
        return params;
    },

    8: function(params, value) {
        value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
        params.push(value);
        return params;
    },

    10: function(params, value) { params.push(value); return params; },

    11: function(params, value, string) {
        return parseParam(params, string);
    }
});

var parseFn = parser(/^(name)(:)/, {
    1: function(fn, name) {
        return transforms[name];
    },

    2: function(fn, value, string) {
        var params = parseParam([], string);
        return fn.apply(null, params);
    }
});

var parseFns = parser(/^\|/, {
    0: function(data, name) {
        var fn = parseFn(null, string);
        data.push(fn);
        return parseFns(data, string);
    }
});

var parseTag = parse(/\{\[(path.to.thing)/, {
    1: function(data, path) {
        data.path = path;
        return data;
    },

    2: function(data, punc, string) {
        var fns = parseFns([], string);
        data.fn = pipe.apply(null, fns);
        return data;
    }
}, /\]\}/);
