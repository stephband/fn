
import insert from './insert.js';

const assign = Object.assign;

/*
update(fn, array, object)

Compares the result of calling `fn` on `object` to the result of calling `fn`
on each value in `array`. If a match is found, `object` has its properties
assigned to that target, and if not the `object` is spliced into the
array (preserving a sort order based on the result of `fn(object)`).

Returns the updated object.
*/

export default function update(fn, construct, array, source) {
    const id  = fn(source);
    const obj = array.find((obj) => fn(obj) === id);

    return obj ?
        assign(obj, source) :
        insert(fn, array, construct(source)) ;
}
