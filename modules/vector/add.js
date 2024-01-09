/* add(vector1, vector2) */

export default function add(v1, v2) {
    return Float32Array.from(v2, (n, i) => n + (v1[i] || 0));
}
