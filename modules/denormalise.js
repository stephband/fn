
/**
denormalise(min, max, value)
**/

export default function linear(min, max, value) {
    return value * (max - min) + min;
}
