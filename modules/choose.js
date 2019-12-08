/*
choose(fn, map)
Returns a function that passes its first argument to `fn(argument)`,
which must return an object key that is then used to select a function
in `map` to invoke with the remaining arguments.

Where `map` has a function `default`, that function is run when a key
is not found, otherwise unfound keys will error.
```
choose((o) => (o ? 'yes' : 'no'), {
    yes:     fn,
    no:      fn,
    default: fn
});
```
*/

import rest from './lists/rest.js';

export default function choose(map) {
    return function choose(key) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, rest(1, arguments)) ;
    };
}
