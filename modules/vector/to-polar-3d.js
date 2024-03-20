
import mag from './mag.js';

/**
toPolar3D(cartesian3D)
**/

export default function toPolar3D(vector, buffer = new Float32Array(3)) {
    const [x, y, z] = vector;
    const d = mag(vector);

    // distance
    buffer[0] = d;
    // theta
    buffer[1] = Math.atan2(y, x);
    // phi
    buffer[2] = d ? Math.acos(z / d) : 0 ;

    return buffer;
}
