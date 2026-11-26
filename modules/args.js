/**
args()
Returns arguments. Not the `arguments` object, that forces V8 onto a slow path
apparently, but the collected `(..args)` object.

```
args(1, 2, 3)    // [1, 2, 3]
```
*/

export default function args(...args) { return args; }
