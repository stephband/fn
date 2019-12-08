/*
parseValue(units, string)
*/


//import id from './id.js';
//import { toLevel } from './maths/core.js';

// Be generous in what we accept, space-wise
const runit = /^\s*(-?\d*\.?\d+)(\w+)?\s*$/;

export default function parseValue(units, string) {
    var entry = runit.exec(string);

    if (!entry) {
        return;
        // throw new Error('Cannot parse value "' + string + '"');
    }

    var value = parseFloat(entry[1]);
    var unit  = entry[2];

    if (!unit) {
        return value;
    }

    if (!units[unit]) {
        return;
        // throw new Error('Cannot parse unit "' + unit + '" not found in units');
    }

    return units[unit](value);
}
