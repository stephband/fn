/*
invoke(name, parameters, object)
Invokes `object.name()` with `parameters` as arguments. For example:

```
models.forEach(invoke('save', [version]));
```
*/

export default function invoke(name, values, object) {
    return object[name].apply(object, values);
}
