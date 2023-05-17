/**
overload(fn, object)

Returns an overloaded.

Takes a `fn` that returns a string key, and an `object` of key:function
pairs. The returned function calls `fn` with all arguments to get a key,
then calls the function at `object[key]` with all arguments.

Where `fn` returns `undefined`, `object.default` is called if it is defined
in `object`, otherwise `overload` throws a 'no function defined for key' error.

```
var handleEvent = overload(get('type'), {
    click:   (e) => {...},
    input:   (e) => {...},
    default: (e) => {...}
});
```
*/


export default function overload(fn, map) {
    return function overload() {
        const key     = fn.apply(this, arguments);
        const handler = (map[key] || map.default);

        if (!handler) {
            throw new Error('overload() no function defined for key "' + key + '"');
        }

        return handler.apply(this, arguments);
    };
}
