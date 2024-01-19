
/**
toCartesian3D(polar3D)
**/

export default function toCartesian3D(polar, buffer = new Float32Array(3)) {
    const [d, theta, phi] = polar;

    // x
    buffer[0] = d * Math.sin(phi) * Math.cos(theta);
    // y
    buffer[1] = d * Math.sin(phi) * Math.sin(theta);
    // z
    buffer[2] = d * Math.cos(phi);

    return buffer;
}
