export function add(a, b) { return b + a; };
export function multiply(a, b) { return b * a; };
export function min(a, b) { return a > b ? b : a ; };
export function max(a, b) { return a < b ? b : a ; };
export function pow(n, x) { return Math.pow(x, n); };
export function exp(n, x) { return Math.pow(n, x); };
export function log(n, x) { return Math.log(x) / Math.log(n); };
export function root(n, x) { return Math.pow(x, 1/n); };

export function mod(d, n) {
    // JavaScript's modulu operator % uses Euclidean division, but for
    // stuff that cycles through 0 the symmetrics of floored division
    // are more useful.
    // https://en.wikipedia.org/wiki/Modulo_operation
    var value = n % d;
    return value < 0 ? value + d : value ;
};

export function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
};

export function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
};

export function todB(n) { return 20 * Math.log10(n); };
export function toLevel(n) { return Math.pow(2, n/6); };
export function toRad(n) { return n / angleFactor; };
export function toDeg(n) { return n * angleFactor; };
