
/** mix(object, mixin)
Defines properties (and property descriptors) of mixin on object.
**/

const define = Object.defineProperty;

export default function mix(object, mixin) {
    for (const key in mixin) {
        define(object, getOwnPropertyDescriptor(mixin, key));
    }

    return object;
}
