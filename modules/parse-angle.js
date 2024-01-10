
import id         from './id.js';
import parseValue from './parseValue.js';
import toRad      from './to-rad.js';

/**
parseAngle(string)
Parses strings of the form `'45deg'`, `'0rad'` or `'0.5turn'`. Returns a
number in radians. If `string` is a number, it passes through.
**/

export default parseValue({
    deg:  toRad,
    rad:  id,
    turn: (n) => n * 2 * Math.PI,
    catch: function(string) {
        throw new Error('Cannot parse value "' + string + '"');
    }
});
