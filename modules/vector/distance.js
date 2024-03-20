
import mag      from './mag.js';
import subtract from './subtract.js';

export default function distance(vector1, vector2) {
    return mag(subtract(vector1, vector2));
}
