
/**
toCartesian3D(polar3D)
**/

export default function toCartesian3D([d, theta, phi]) {
    return Float32Array.of(
        // x
        d * Math.sin(phi) * Math.cos(theta),
        // y
        d * Math.sin(phi) * Math.sin(theta),
        // z
        d * Math.cos(phi)
    );
}
