/* add(vector1, vector2[, buffer, n]) */

export default function add(v1, v2, buffer = Float32Array.from(v2), n = 0) {
    let i = buffer.length;
    while (i--) {
        buffer[n + i] = v2[n + i] + (v1[n + i] || 0);
    }
    return buffer;
}
