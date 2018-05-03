export default function latest(source) {
    var value = source.shift();
    return value === undefined ? arguments[1] : latest(source, value) ;
};
