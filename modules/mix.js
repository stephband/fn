
/** mix(object, mixin)
Defines properties (and property descriptors) of mixin on object.
**/

export default function mix(a, b) {
    const descriptors = Object.getOwnPropertyDescriptors(b);

    // Do not overwrite constructor property
    delete descriptors.constructor;

    return Object.defineProperties(a, descriptors);
}
