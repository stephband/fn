import capture     from './capture.js';
import exec        from './exec.js';
import id          from './id.js';
import noop        from './noop.js';
import nothing     from './nothing.js';
import parseParams from './parse-params.js';


/**
parsePipe(array, string)
**/

const parsePipe = capture(/^\s*([\w-]+)\s*(:)?\s*/, {
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
        throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
    }
});

export default parsePipe;
