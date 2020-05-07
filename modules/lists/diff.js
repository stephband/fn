import toArray    from '../to-array.js';
import { filter } from './core.js';

/**
diff(array1, array2)
**/

export default function diff(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return true; }
        values.splice(i, 1);
        return false;
    }, object)
    .concat(values);
}
