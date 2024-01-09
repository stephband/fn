
import id         from './id.js';
import parseValue from './parseValue.js';
import toDeg      from './to-deg.js';
import toRad      from './to-rad.js';

/**
parseAngle(string)


**/

export default parseValue({
    deg:  toRad,
    rad:  id,
    turn: (n) => n * 2 * Math.PI,
    catch: function(string) {
        throw new Error('Cannot parse value "' + string + '"');
    }
});
