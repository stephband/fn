
/**
denormaliseQuadratic(min, max, value)
**/

export default (min, max, value) =>
    Math.pow(value, 2) * (max - min) + min;
