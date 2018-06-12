
const symbol = Symbol('privates');

export default function privates(object) {
    return object[symbol] || (object[symbol] = {});
}
