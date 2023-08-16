
/**
toPolar3D(cartesian3D)
**/

export default function toPolar3D([x, y, z]) {
    const radius = Math.sqrt(x*x + y*y + z*z);
    const theta  = Math.atan2(y, x);
    const phi    = radius ? Math.acos(z / radius) : 0 ;
    return Float64Array.of(radius, theta, phi);
}
