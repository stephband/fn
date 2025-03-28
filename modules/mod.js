/**
mod(divisor, n)
JavaScript's modulus operator (`%`) uses Euclidean division, but for
stuff that cycles through 0 the symmetrics of floored division are often
are more useful. This function implements floored division.
**/

export default function mod(d, n) {
    return ((n % d) + d) % d ;
}
