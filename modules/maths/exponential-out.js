// Exponential functions
//
// e - exponent
// x - range 0-1
//
// eg.
// var easeInQuad   = exponential(2);
// var easeOutCubic = exponentialOut(3);
// var easeOutQuart = exponentialOut(4);

export default function exponentialOut(e, x) {
    return 1 - Math.pow(1 - x, e);
};
