
/**
normalise(min, max, value)
**/

export default function linear(min, max, value) {
    return (value - min) / (max - min);
}
