
import { def } from './types.js';

export const linear = def(
    'Number, Number, Number',
    (min, max, value) => (value - min) / (max - min)
);

export const quadratic = def(
    'Number, Number, Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/2)
);

export const cubic = def(
    'Number, Number, Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/3)
);

export const logarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber',
    (min, max, value) => Math.log(value / min) / Math.log(max / min)
);

export const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber',
    (min, max, crossover, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= min ?
            (value / min) / 9 :
            0.1111111111111111 + (Math.log(value / min) / Math.log(max / min)) / 1.125 ;
    }
);
