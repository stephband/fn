
/**
toCartesian3D(polar3D)
**/

export default function toCartesian3D([radius, theta, phi]) {
    return Float64Array.of(
        // x
        radius * Math.sin(phi) * Math.cos(theta),
        // y
        radius * Math.sin(phi) * Math.sin(theta),
        // z
        radius * Math.cos(phi)
    );
}
