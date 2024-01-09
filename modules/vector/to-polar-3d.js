
import mag from './mag.js';

/**
toPolar3D(cartesian3D)
**/

export default function toPolar3D(vector) {
    const [x, y, z] = vector;
    const d         = mag(vector);
    const theta     = Math.atan2(y, x);
    const phi       = d ? Math.acos(z / d) : 0 ;
    return Float32Array.of(d, theta, phi);
}
