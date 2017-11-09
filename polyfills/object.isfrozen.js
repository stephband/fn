try {
    Object.isFrozen(3);
}
catch (e) {
    // IE isFrozen does not accept primitives or null. Overwrite.
    var _isFrozen = Object.isFrozen;
    Object.isFrozen = function isFrozen(object) {
        return object && typeof object === 'object' && _isFrozen(object);
    };
}
