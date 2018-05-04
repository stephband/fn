
import compose from '../compose.js';
import { is }  from '../../fn.js';
import { insert }  from './core.js';

const assign = Object.assign;

export default function update(fn, target, array) {
    return array.reduce(function(target, obj2) {
        var obj1 = target.find(compose(is(fn(obj2)), fn));
        if (obj1) {
            assign(obj1, obj2);
        }
        else {
            insert(fn, target, obj2);
        }
        return target;
    }, target);
}
