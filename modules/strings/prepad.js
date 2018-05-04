
export default function prepad(chars, n, value) {
    var string = value + '';
    var i = -1;
    var pre = '';

    while (pre.length < n - string.length) {
        pre += chars[++i % chars.length];
    }

    string = pre + string;
    return string.slice(string.length - n);
};
