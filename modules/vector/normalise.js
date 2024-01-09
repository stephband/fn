
import mag      from './mag.js';
import multiply from './multiply.js';

/**
normalise(vector)
Normalises `vector` to have a distance of 1.
**/

export default function normalise(vector) {
    return multiply(1 / mag(vector), vector);
}
