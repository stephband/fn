/* cross3d(vector1, vector2) */

export default function cross3d([ax,ay,az], [bx,by,bz]) {
    return Float32Array.of(
        ay * bz − az * by,
        az * bx − ax * bz,
        ax * by − ay * bx
    );
}
