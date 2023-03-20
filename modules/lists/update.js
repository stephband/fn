
/**
update(create, destroy, fn, target, source)

Returns a new array containing items that are either matched objects from
`target` assigned new data from `source` objects or, where no match is found,
new objects created by calling `create` on a `source` object. Any objects
in `target` that are not matched to `source` objects are destroyed by calling
`destroy` on them.
**/

const assign = Object.assign;

export default function update(create, destroy, fn, target, source) {
    const ids     = target.map(fn);
    const indexes = {};
    const output  = source.map(function(data) {
        const id = fn(data);
        const i  = ids.indexOf(id);

        if (i < 0) {
            return create.prototype ?
                new create(data) :
                create(data);
        }

        // Has it already been processed? Oops.
        if (indexes[i]) {
            throw new Error('Failed to update target array, source data contains duplicates');
        }

        indexes[i] = true;
        return assign(target[i], data);
    });

    target.forEach(function(object) {
        if (!output.includes(object)) {
            destroy(object);
        }
    });

    return output;
}
