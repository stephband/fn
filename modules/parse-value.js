import curry from './curry.js';

/**
parseValue(units, string)

Parse `string` as a value with a unit (such as `"3px"`). Parameter `units` is an
object of functions keyed by the unit postfix. It may also have a `catch`
function.

```js=
const parseUnitValue = parseValue({
    px: function(n) {
        return n;
    },

    catch: function(string) {
        throw new Error('Cannot parse px value');
    }
});
```
**/

// Be generous in what we accept, space-wise, but exclude spaces between the
// number and the unit
const runit = /^\s*([+-]?\d*\.?\d+)([^\s]*)\s*$/;

export default function parseValue(units) {
    return function parseValue(string) {
        // Allow number to pass through
        if (typeof string === 'number') {
            return units[''] ?
                // Treat number the same as a a string number without units
                units[''](string) ;
                // But if there is no entry for it allow it to pass through
                string ;
        }

        var entry = runit.exec(string);

        if (!entry || !units[entry[2] || '']) {
            if (!units.catch) {
                throw new Error('Cannot parse value "' + string + '" (accepted units ' + Object.keys(units).join(', ') + ')');
            }

            return entry ?
                units.catch(parseFloat(entry[1]), entry[2]) :
                units.catch(parseFloat(string)) ;
        }

        return units[entry[2] || ''](parseFloat(entry[1]));
    };
}
