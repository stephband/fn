
export default function isMutableProperty(name, object) {
    // If there's a descriptor return its mutability
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) return descriptor.writable || !!descriptor.set ;

    // If there's a prototype look for property on it
    const prototype = Object.getPrototypeOf(object);
    if (prototype) return isMutableProperty(name, prototype);

    // If there is no prototypes property must be unset
    return true;
}
