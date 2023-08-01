
/**
toCartesian2D(polar2D)
**/

export default function toCartesian2D([r, a]) {
    return Float64Array.of(
        // x
        r * Math.cos(a),
        // y
        r * Math.sin(a)
    );
}
