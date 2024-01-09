
export default function rotate3D([rx, ry, rz], [x, y, z]) {
    // Magnitude of rotation vector is the angle to rotate
    const angle = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const sinA  = Math.sin(angle);
    const cosA  = Math.cos(angle);
    const oneMinusCosA = 1 - cosA;

    const xyM = x * y * oneMinusCosA;
    const xzM = x * z * oneMinusCosA;
    const yzM = y * z * oneMinusCosA;

    const xs = x * sinA;
    const ys = y * sinA;
    const zs = z * sinA;

    const matrix0 = rx * rx * oneMinusCosA + cosA;
    const matrix1 = xyM - zs;
    const matrix2 = xzM + ys;
    const matrix3 = xyM + zs;
    const matrix4 = ry * ry * oneMinusCosA + cosA;
    const matrix5 = yzM - xs;
    const matrix6 = xzM - ys;
    const matrix7 = yzM + xs;
    const matrix8 = rz * rz * oneMinusCosA + cosA;

    return Float32Array.of(
        matrix0 * x + matrix1 * y + matrix2 * z,
        matrix3 * x + matrix4 * y + matrix5 * z,
        matrix6 * x + matrix7 * y + matrix8 * z
    );
}
