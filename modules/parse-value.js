import curry from './curry.js';

/**
parseValue(units, string)

Parse `string` as a value with a unit (such as `"3px"`). Parameter `units` is an
object of functions keyed by the unit postfix. It may also have a `catch`
function.

```js=
const value = parseValue({
    px: function(n) {
        return n;
    },

    catch: function(string) {
        if (typeof string === 'number') {
            return string;
        }

        throw new Error('Cannot parse px value');
    }
}, '36px');
```
**/

// Be generous in what we accept, space-wise
const runit = /^\s*(-?\d*\.?\d+)(\w+|%)?\s*$/;

export function parseValue(units, string) {
    var entry = runit.exec(string);

    if (!entry || !units[entry[2]]) {
        if (!units.catch) {
            throw new Error('Cannot parse value "' + string + '"');
        }

        return units.catch(string);
    }

    return units[entry[2]](parseFloat(entry[1]));
}

export default curry(parseValue);
