/* dot(vector1, vector2) */

export default function dot(v1, v2) {
    return v2.reduce((t, v, i) => t + v * (v1[i] || 0), 0);
}
