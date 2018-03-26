export default function overload(fn, map) {
    return typeof map.get === 'function' ?
        function overload() {
            var key = fn.apply(null, arguments);
            return map.get(key).apply(this, arguments);
        } :
        function overload() {
            var key = fn.apply(null, arguments);
            return (map[key] || map.default).apply(this, arguments);
        } ;
}
