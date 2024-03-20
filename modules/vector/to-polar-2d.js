/**
toPolar2D(cartesian2D)
**/

export default function toPolar2D([x, y]) {
    return Float32Array.of(
        // radius
        x === 0 ? Math.abs(y) :
        y === 0 ? Math.abs(x) :
        Math.sqrt(x*x + y*y) ,
        // angle
        Math.atan2(y, x)
    );
}
