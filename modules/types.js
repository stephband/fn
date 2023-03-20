import noop from './noop.js';

const DEBUG = window.DEBUG === true;

const defs = {
    'any': noop,

    'array': (value) =>
        Array.isArray(value),
    
    'array-like': (value) =>
        typeof value.length === 'number',

    'boolean': (value) =>
        typeof value === 'boolean',

    'date': (value) =>
        value instanceof Date
        && !Number.isNaN(value.getTime()),

    'error': (value) =>
        value instanceof Error,

    'function': (value) =>
        typeof value === 'function',

    'int': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value,

    'int<0': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value < 0,
    
    'int<=0': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value <= 0,

    'int>0': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value > 0,

    'int>=0': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value >= 0,

    'number': (value) =>
        typeof value === 'number' && !Number.isNaN(value),

    'number<0': (value) =>
        typeof value === 'number'
        && value < 0,

    'number<=0': (value) =>
        typeof value === 'number'
        && value <= 0,

    'number>0': (value) =>
        typeof value === 'number'
        && value > 0,

    'number>=0': (value) =>
        typeof value === 'number'
        && value >= 0,

    'object': (value) =>
        !!value
        && typeof value === 'object',

    'regexp': (value) =>
        value instanceof RegExp,

    'symbol': (value) =>
        typeof value === 'symbol',

    'null': (value) =>
        value === null
};

export const checkType = DEBUG ? function checkType(type, value, message) {
    if (!defs[type]) {
        if (/^[A-Z]/.test(type)) {
            if (value.constructor.name === type) { return; }
            throw new Error(message || 'value not of type "' + type + '": ' + value);
        }

        throw new Error('Type "' + type + '" not recognised');
    }

    if (!defs[type](value)) {
        throw new Error(message || 'value not of type "' + type + '": ' + value);
    }
} : noop ;

export const validate = DEBUG ? function checkTypes(types, object) {
    Object.entries(types).forEach(([key, type]) =>
        checkType(type, object[key], key + ' not of type "' + type + '" (' + object[key] + ')')
    );
} : noop ;

export const def = DEBUG ? function def(notation, fn, file, line) {
    // notation is of the form:
    // 'Type, Type -> Type'
    // Be generous with what we accept as output marker '->' or '=>'
    var parts = notation.split(/\s*[=-]>\s*/);
    var types = parts[0].split(/\s*,\s*/);
    var returnType = parts[1];

    return function() {
        validate(types, arguments);
        const output = fn.apply(this, arguments);
        checkType(returnType, output, 'return value not of type "' + returnType + '": ' + output);
        return output;
    };
} : function def(notation, fn) {
    return fn;
} ;


/* Deprecated */

export function checkTypes() {
    throw new Error('modules/types.js checkTypes() is now validate()');
}
