
/**
normaliseQuadratic(min, max, value)
**/

export default (min, max, value) =>
    Math.pow((value - min) / (max - min), 1/2);
