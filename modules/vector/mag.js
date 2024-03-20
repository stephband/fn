const A = Array.prototype;

function reducer(total, value) {
    return total + value * value;
}

export default function mag(vector) {
    return Math.sqrt(vector.reduce ?
        vector.reduce(reducer, 0) :
        A.reduce.call(vector, reducer, 0)
    );
}
