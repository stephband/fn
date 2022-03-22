/**
gaussian()

Generate a random number with a gaussian distribution centred
at 0 with limits -1 to 1.
**/

export function gaussian() {
    return Math.random() + Math.random() - 1;
}
