
export default function translate(v1, v2) {
    let n = v1.length > v2.length ?
        v1.length :
        v2.length ;

    const array = new Float64Array(n);

    while (n--) {
        array[n] = (v2[n] || 0) + (v1[n] || 0);
    }

    return array;
}
