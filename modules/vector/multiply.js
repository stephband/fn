
import overload from '../overload.js';
import toType   from '../to-type.js';

export default overload(toType, {
    // multiply(number, vector)
    'number': (n, v2) => Float64Array.from(v2, (v) => v * n),

    // multiply(vector1, vector2)
    default: (v1, v2) => {
        let l = v1.length > v2.length ?
            v1.length :
            v2.length ;

        const array = new Float64Array(l);

        while (l--) {
            array[l] = (v2[l] || 0) * (v1[l] || 0);
        }

        return array;
    }
});
