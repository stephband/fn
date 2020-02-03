/*
invoke(name, parameters, object)
Invokes `object.name()` with `parameters` as arguments. For example:

```
models.forEach(invoke('save', [version]));
```
*/

import curry from './curry.js';

export function invoke(name, values, object) {
    return object[name].apply(object, values);
}

export default curry(invoke, true);
