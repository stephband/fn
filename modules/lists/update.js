
import insert from './insert.js';

const assign = Object.assign;

/*
update(fn, array, source)

Compares the result of calling `fn` on `source` to the result of calling `fn`
on objects in `array`. If a target match is found, `source` has its properties
assigned to that target object, and if not the `source` is spliced into the
array preserving a sort order based on the result of `fn(object)`.

Returns the updated object.
*/

export default function update(fn, construct, array, source) {
    const id  = fn(source);
    const obj = array.find((obj) => fn(obj) === id);

    return obj ?
        assign(obj, source) :
        insert(fn, array, construct(source)) ;
}
