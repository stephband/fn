
import curry from '../curry.js';

export function sum(a, b) { return b + a; }
export function multiply(a, b) { return b * a; }
export function pow(n, x) { return Math.pow(x, n); }
export function exp(n, x) { return Math.pow(n, x); }
export function log(n, x) { return Math.log(x) / Math.log(n); }
export function root(n, x) { return Math.pow(x, 1/n); }

export const curriedSum   = curry(sum);
export const curriedMultiply = curry(multiply);
export const curriedMin   = curry(Math.min, false, 2);
export const curriedMax   = curry(Math.max, false, 2);
export const curriedPow   = curry(pow);
export const curriedExp   = curry(exp);
export const curriedLog   = curry(log);
export const curriedRoot  = curry(root);
