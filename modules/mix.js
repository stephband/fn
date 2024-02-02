
/** mix(object, mixin)
Defines properties (and property descriptors) of mixin on object.
**/

export default function mix(target, ...objects) {
    const descriptors = objects.map(Object.getOwnPropertyDescriptors);
    const descriptor  = Object.assign({}, ...descriptors);

    // Do not overwrite constructor property, no no no
    delete descriptor.constructor;
    return Object.defineProperties(target, descriptor);
}
