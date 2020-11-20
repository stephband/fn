import capture from './capture.js';
import exec    from './exec.js';
import id      from './id.js';
import noop    from './noop.js';
import nothing from './nothing.js';


/**
parseParams(array, string)
**/

//                                        number                                     "string"            'string'                    null   true   false    [array]      {object}   function(args)   /regex/             dot  string             comma
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[[^\]]*\])|(\{[^}]*\})|(\w+)\(([^)]+)\)|\/((?:[^/]|\.)*)\/|(\.)?([\w.\-#/?:\\]+))/, {
    // number
    1: function(params, tokens) {
        params.push(parseFloat(tokens[1]));
        return params;
    },

    // "string"
    2: function(params, tokens) {
        params.push(tokens[2]);
        return params;
    },

    // 'string'
    3: function(params, tokens) {
        params.push(tokens[3]);
        return params;
    },

    // null
    4: function(params) {
        params.push(null);
        return params;
    },

    // true
    5: function(params) {
        params.push(true);
        return params;
    },

    // false
    6: function(params) {
        params.push(false);
        return params;
    },

    // [array]
    7: function(params, tokens) {
        params.push(JSON.parse(tokens[7]));
        return params;
    },

    // flat {object}
    8: function (params, tokens) {
        params.push(JSON.parse(tokens[8]));
        return params;
    },

    // Todo: review syntax for nested functions
    // function(args)
    //8: function(params, value, result) {
    //    // Todo: recurse to parseFn for parsing inner functions
    //    value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
    //    params.push(value);
    //    return params;
    //},

    // /regexp/
    11: function(params, tokens) {
        const regex = RegExp(tokens[11]);
        params.push(regex);
    },

    // string
    13: function(params, tokens) {
        params.push(tokens[13]);
        return params;
    },

    // Comma terminator - more params to come
    close: capture(/^\s*(,)/, {
        1: function(params, tokens) {
            parseParams(params, tokens);
        },

        catch: id
    }),

    catch: function(params, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        throw new SyntaxError('Invalid parameter "' + (string.input || string) + '"');
    }
});


/**
parsePipe(array, string)
**/

export const parsePipe = capture(/^\s*([\w-]+)\s*(:)?\s*/, {
    // Function name '...'
    1: function(fns, tokens) {
        fns.push({
            name: tokens[1],
            args: nothing
        });

        return fns;
    },

    // Params ':'
    2: function(fns, tokens) {
        fns[fns.length - 1].args = parseParams([], tokens);
        return fns;
    },

    close: capture(/^\s*(\|)?\s*/, {
        // More pipe '|'
        1: function(fns, tokens) {
            return parsePipe(fns, tokens);
        }
    }),

    catch: function(fns, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        console.log(string.input, string);
        throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
    }
});
