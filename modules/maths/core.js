// Constant for converting radians to degrees
const angleFactor = 180 / Math.PI;

export function add(a, b)  { return b + a; }
export function multiply(a, b) { return b * a; }
export function min(a, b)  { return a > b ? b : a ; }
export function max(a, b)  { return a < b ? b : a ; }
export function pow(n, x)  { return Math.pow(x, n); }
export function exp(n, x)  { return Math.pow(n, x); }
export function log(n, x)  { return Math.log(x) / Math.log(n); }
export function root(n, x) { return Math.pow(x, 1/n); }

/*
mod(divisor, n)
JavaScript's modulu operator (`%`) uses Euclidean division, but for
stuff that cycles through 0 the symmetrics of floored division are often
are more useful.
*/

export function mod(d, n) {
    var value = n % d;
    return value < 0 ? value + d : value ;
}

/*
limit(min, max, n)
*/

export function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

export function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
}

/*
gcd(a, b)
*/

export function gcd(a, b) {
    // Greatest common divider
    return b ? gcd(b, a % b) : a ;
}

/*
lcm(a, b)
*/

export function lcm(a, b) {
    // Lowest common multiple.
    return a * b / gcd(a, b);
}

export function factorise(n, d) {
    // Reduce a fraction by finding the Greatest Common Divisor and
    // dividing by it.
    var f = gcd(n, d);
    return [n/f, d/f];
}

/*
gaussian()
Generate a random number with a bell curve probability centred
around 0 with limits -1 to 1.
*/

export function gaussian() {
    return Math.random() + Math.random() - 1;
}

/*
todB(level)
*/

// A bit disturbingly, a correction factor is needed to make todB() and
// to toLevel() reciprocate more accurately. This is quite a lot to be off
// by... Todo: investigate?
const dBCorrectionFactor = (60 / 60.205999132796244);

export function todB(n)    { return 20 * Math.log10(n) * dBCorrectionFactor; }

/*
toLevel(dB)
*/

export function toLevel(n) { return Math.pow(2, n / 6); }

export function toRad(n)   { return n / angleFactor; }
export function toDeg(n)   { return n * angleFactor; }
