/**
arg(n)

Returns a function that returns `argument[n]`.

```js
```
**/

export default function arg(n) {
    return function arg() {
        return arguments[n];
    };
}
