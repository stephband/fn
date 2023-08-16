/**
toPolar(cartesian)
**/

export default function toPolar([x, y]) {
    return [
        // Distance
        x === 0 ?
            Math.abs(y) :
        y === 0 ?
            Math.abs(x) :
            Math.sqrt(x*x + y*y) ,
        // Angle
        Math.atan2(x, y)
    ];
}
