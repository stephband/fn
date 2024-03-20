
export default function multiply(n, v2, buffer = Float32Array.from(v2)) {
    let i = v2.length;
    while (i--) buffer[i] = n * v2[i];
    return buffer;
}

function multiplyMatrixPoint(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, px, py, pz, pw = 1, buffer = new Float32Array(4), n = 0) {
    console.log('pw should be 1', pw);

    // Multiply the point against each part of the 1st column, then add together
    buffer[n + 0] = px * m0 + py * m4 + pz * m8  + pw * m12;
    // Multiply the point against each part of the 2nd column, then add together
    buffer[n + 1] = px * m1 + py * m5 + pz * m9  + pw * m13;
    // Multiply the point against each part of the 3rd column, then add together
    buffer[n + 2] = px * m2 + py * m6 + pz * m10 + pw * m14;
    // Multiply the point against each part of the 4th column, then add together
    buffer[n + 3] = px * m3 + py * m7 + pz * m11 + pw * m15;

    return buffer;
}

function multiplyMatrixAndPoint(matrix, point, buffer, n) {
    return multiplyMatrixPoint(...matrix, ...point, buffer, n);
}

function multiplyMatrixMatrix(matrixA, matrixB, buffer = new Float32Array(matrixB.length), n = 0) {
    // Adapted from
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Matrix_math_for_the_web

    if (window.DEBUG && matrixA === buffer) {
        throw new Error('matrixA may not be the same object as buffer (matrixB may be).');
    }

    // Multiply each row in matrixB by matrixA, storing results in buffer n + 0-15
    multiplyMatrixPoint(...matrixA, matrixB[0],  matrixB[1],  matrixB[2],  matrixB[3],  buffer, n + 0);
    multiplyMatrixPoint(...matrixA, matrixB[4],  matrixB[5],  matrixB[6],  matrixB[7],  buffer, n + 4);
    multiplyMatrixPoint(...matrixA, matrixB[8],  matrixB[9],  matrixB[10], matrixB[11], buffer, n + 8);
    multiplyMatrixPoint(...matrixA, matrixB[12], matrixB[13], matrixB[14], matrixB[15], buffer, n + 12);

    return buffer;
}

function matrixFromTranslate([x, y, z]) {
    return Float32Array.of(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    );
}

function matrixFromScale([w, h, d]) {
    return Float32Array.of(
        w, 0, 0, 0,
        0, h, 0, 0,
        0, 0, d, 0,
        0, 0, 0, 1
    );
}

function matrixFromRotationX(rx) {
    return Float32Array.of(
        1, 0,       0,        0,
        0, cos(rx), -sin(rx), 0,
        0, sin(rx), cos(rx),  0,
        0, 0,       0,        1
    );
}

function matrixFromRotationY(ry) {
    return Float32Array.of(
        cos(ry),  0, sin(ry), 0,
        0,        1, 0,       0,
        -sin(ry), 0, cos(ry), 0,
        0,        0, 0,       1
    );
}

function matrixFromRotationZ(rz) {
    return Float32Array.of(
        cos(a), -sin(a), 0, 0,
        sin(a), cos(a),  0, 0,
        0,      0,       1, 0,
        0,      0,       0, 1
    );
}

function matrixFromRotation([rx, ry, rz]) {
    const mx = matrixFromRotationX(rx);
    const my = matrixFromRotationX(ry);
    const mz = matrixFromRotationX(rz);
    return multiplyMatrixMatrix(multiplyMatrixMatrix(mx, my), mz);
}

function invertMatrixN(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, buffer = new Float32Array(16), n = 0) {
    const a = m9 * m14 * m7  - m13 * m10 * m7 + m13 * m6 * m11 - m5 * m14 * m11 - m9 * m6 * m15 + m5 * m10 * m15;
    const b = m12 * m10 * m7 - m8 * m14 * m7  - m12 * m6 * m11 + m4 * m14 * m11 + m8 * m6 * m15 - m4 * m10 * m15;
    const c = m8 * m13 * m7  - m12 * m9 * m7  + m12 * m5 * m11 - m4 * m13 * m11 - m8 * m5 * m15 + m4 * m9 * m15;
    const d = m12 * m9 * m6  - m8 * m13 * m6  - m12 * m5 * m10 + m4 * m13 * m10 + m8 * m5 * m14 - m4 * m9 * m14;

    var determinant = m0 * a + m1 * b + m2 * c + m3 * d;
    if (determinant === 0) {
        throw new Error("Can't invert matrix, determinant is 0");
    }

    // Write values to buffer
    buffer[n + 0]  = a / determinant;
    buffer[n + 4]  = b / determinant;
    buffer[n + 8]  = c / determinant;
    buffer[n + 12] = d / determinant;
    buffer[n + 1]  = (m13 * m10 * m3 - m9 * m14 * m3  - m13 * m2 * m11 + m1 * m14 * m11 + m9 * m2 * m15 - m1 * m10 * m15) / determinant;
    buffer[n + 5]  = (m8 * m14 * m3  - m12 * m10 * m3 + m12 * m2 * m11 - m0 * m14 * m11 - m8 * m2 * m15 + m0 * m10 * m15) / determinant;
    buffer[n + 9]  = (m12 * m9 * m3  - m8 * m13 * m3  - m12 * m1 * m11 + m0 * m13 * m11 + m8 * m1 * m15 - m0 * m9 * m15)  / determinant;
    buffer[n + 13] = (m8 * m13 * m2  - m12 * m9 * m2  + m12 * m1 * m10 - m0 * m13 * m10 - m8 * m1 * m14 + m0 * m9 * m14)  / determinant;
    buffer[n + 2]  = (m5 * m14 * m3  - m13 * m6 * m3  + m13 * m2 * m7  - m1 * m14 * m7  - m5 * m2 * m15 + m1 * m6 * m15)  / determinant;
    buffer[n + 6]  = (m12 * m6 * m3  - m4 * m14 * m3  - m12 * m2 * m7  + m0 * m14 * m7  + m4 * m2 * m15 - m0 * m6 * m15)  / determinant;
    buffer[n + 10] = (m4 * m13 * m3  - m12 * m5 * m3  + m12 * m1 * m7  - m0 * m13 * m7  - m4 * m1 * m15 + m0 * m5 * m15)  / determinant;
    buffer[n + 14] = (m12 * m5 * m2  - m4 * m13 * m2  - m12 * m1 * m6  + m0 * m13 * m6  + m4 * m1 * m14 - m0 * m5 * m14)  / determinant;
    buffer[n + 3]  = (m9 * m6 * m3   - m5 * m10 * m3  - m9 * m2 * m7   + m1 * m10 * m7  + m5 * m2 * m11 - m1 * m6 * m11)  / determinant;
    buffer[n + 7]  = (m4 * m10 * m3  - m8 * m6 * m3   + m8 * m2 * m7   - m0 * m10 * m7  - m4 * m2 * m11 + m0 * m6 * m11)  / determinant;
    buffer[n + 11] = (m8 * m5 * m3   - m4 * m9 * m3   - m8 * m1 * m7   + m0 * m9 * m7   + m4 * m1 * m11 - m0 * m5 * m11)  / determinant;
    buffer[n + 15] = (m4 * m9 * m2   - m8 * m5 * m2   + m8 * m1 * m6   - m0 * m9 * m6   - m4 * m1 * m10 + m0 * m5 * m10)  / determinant;

    // Return buffer
    return buffer;
}

function invertMatrix(matrix, buffer, n) {
    return invertMatrixN(...matrix, buffer, n);
}



function perspectiveMatrix(fieldOfViewInRadians, aspectRatio, near, far) {
    /*
    Field of view - the angle in radians of what's in view along the Y axis
    Aspect Ratio - the ratio of the canvas, typically canvas.width / canvas.height
    Near - Anything before this point in the Z direction gets clipped (resultside of the clip space)
    Far - Anything after this point in the Z direction gets clipped (outside of the clip space)
    */
    var f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
    var rangeInv = 1 / (near - far);

    return Float32Array.of(
        f / aspectRatio, 0, 0,                         0,
        0,               f, 0,                         0,
        0,               0, (near + far) * rangeInv,   -1,
        0,               0, near * far * rangeInv * 2, 0
    );
}
