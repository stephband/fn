/**
set(key, object, value)

```
// Set `input.value` whenever a value is pushed into a stream:
stream.scan(set('value'), input);
```
*/

import curry from './curry.js';

export function set(key, object, value) {
    return typeof object.set === "function" ?
        object.set(key, value) :
        (object[key] = value) ;
}

export default curry(set, true)
