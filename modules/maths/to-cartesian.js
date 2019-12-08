
/*
toCartesian(polar)
*/

export default function toCartesian(polar) {
    var d = polar[0];
    var a = polar[1];

    return [
        Math.sin(a) * d ,
        Math.cos(a) * d
    ];
};
