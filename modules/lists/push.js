/**
.push(array, value)


**/

const A = Array.prototype;

export default function push(array, value) {
    if (array.push) {
        array.push(value);
    }
    else {
        A.push.call(array, value);
    }

    return value;
}
