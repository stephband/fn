
import { def } from './types.js';

// Denormalisers take a min and max and transform a value into that range
// from the range of a curve of a given type

export const linear = def(
    'Number, Number, Number => Number',
    (min, max, value) => value * (max - min) + min
);

export const quadratic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 2) * (max - min) + min
);

export const cubic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 3) * (max - min) + min
);

export const logarithmic = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => min * Math.pow(max / min, value)
);

export const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= 0.1111111111111111 ?
            value * 9 * min :
            min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
    }
);

import { linear as normalise } from './normalisers.js';
import bezierify from './maths/cubic-bezier.js';

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

export const cubicBezier = def(
    'Object, Object, Number => Number',
    (begin, end, value) => linear(begin.point[1], end.point[1], bezierify({
        0: normalise(begin.point[0], end.point[0], begin.handle[0]),
        1: normalise(begin.point[1], end.point[1], begin.handle[1])
    }, {
        0: normalise(begin.point[0], end.point[0], end.handle[0]),
        1: normalise(begin.point[1], end.point[1], end.handle[1])
    }, 1, value))
);



/* Todo: does it do as we intend?? */
export const tanh = def(
    'Number, Number, Number => Number',
    (min, max, value) => (Math.tanh(value) / 2 + 0.5) * (max - min) + min
);
