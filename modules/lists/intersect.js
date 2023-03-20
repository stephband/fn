
import { filter } from './core.js';
import toArray    from '../to-array.js';

export default function intersect(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return false; }
        values.splice(i, 1);
        return true;
    }, object);
}
