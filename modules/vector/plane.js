
function planeFromPoints(a, b, c) {
    const normal   = normalise(cross(subtract(a, b), subtract(a, c)));
    const distance = dot(normal, a);
    return Float32Array.of(normal[0], normal[1], normal[2], distance);
}

function isPlanePoint(plane, point) {
    return dot(plane, point) === plane[3];
}
