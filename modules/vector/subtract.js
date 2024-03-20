
export default function subtract(v1, v2) {
    return Float32Array.from(v2, (n, i) => n - (v1[i] || 0));
}
