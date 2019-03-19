
import { def } from './types.js';

// Denormalisers take a min and max and transform a value into that range
// from the range of a curve of a given type

export const linear = def(
    'Number, Number, Number',
    (min, max, value) => value * (max - min) + min
);

export const quadratic = def(
    'Number, Number, Number',
    (min, max, value) => Math.pow(value, 2) * (max - min) + min
);

export const cubic = def(
    'Number, Number, Number',
    (min, max, value) => Math.pow(value, 3) * (max - min) + min
);

export const logarithmic = def(
    'PositiveNumber, PositiveNumber, Number',
    (min, max, value) => min * Math.pow(max / min, value)
);

export const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, Number',
    (min, max, crossover, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= 0.1111111111111111 ?
            value * 9 * min :
            min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
    }
);
