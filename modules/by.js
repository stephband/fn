
/**
by(fn, a, b)

For sorting arrays. Compares `fn(a)` against `fn(b)` and returns `-1`, `0` or
`1`. Partially applicable. To sort an array of objects by their ids:

```
array.sort(by(get('id')))
```
**/

import curry from './curry.js';

export function by(fn, a, b) {
    const fna = fn(a);
    const fnb = fn(b);
    return fnb === fna ? 0 : fna > fnb ? 1 : -1 ;
}

export default curry(by, true);
