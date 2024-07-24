/**
choose(map)
Returns a function that takes its first argument as a key and uses it
to select a function in `map` which is invoked with the remaining arguments.

Where `map` has a function `default`, that function is run when a key
is not found, otherwise unfound keys will error.

```
var fn = choose({
    'fish':  function fn1(a, b) {...},
    'chips': function fn2(a, b) {...}
});

fn('fish',  a, b);      // Calls fn1(a, b)
fn('chips', a, b);      // Calls fn2(a, b)
fn('mayonnaise', a, b); // Error
```

It's worth pointing out that the `this` context is also applied to `fn1` and
`fn2`, making `choose(map)` suitable for creating object methods.
*/

export default function choose(map) {
    return function choose(key, ...params) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, params) ;
    };
}
