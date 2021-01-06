/**
pipe(fn1, fn2, ...)
Returns a function that calls `fn1`, `fn2`, etc., passing the result of
calling one function to the next and returning the the last result.
*/

import noop            from './noop.js';
import overload        from './overload.js';
import self            from './self.js';
import compileFunction from './compile-function.js';
import { addDate }     from './date.js';
import { addTime }     from './time.js';

const DEBUG = true;

/*
function toAddType(n) {
    const type = typeof n;
    return type === 'string' ?
        /^\d\d\d\d(?:-|$)/.test(n) ? 'date' :
        /^\d\d(?::|$)/.test(n) ? 'time' :
        'string' :
    type;
}
*/

const nothing = Object.freeze(Object.create(null));

const illegal = {
    'code':     true,
    'each':     true,
    'fn':       true,
    'state':    true,
    'toJSON':   true,
    'toString': true,
    'value':    true,
    'valueOf':  true
};

const api = {
    add:      (a, n)  => n + a,
    multiply: (a, n)  => n * a,

    map:      (fn, n) => fn(n),
    filter:   (fn, n) => (fn(n) ? n : undefined)
};

const apply = (value, fn) => fn(value);

function create(array) {
    const fns = [];
    var n = -1;
    var name, fn, params;
    while((name = array[++n])) {
        fn = api[name];

        if (!fn.length) {
            fns.push(fn);
        }
        else {
            params = array.slice(n + 1, n + 1 + fn.length);
            fns.push(fn.apply(null, params));
        }

        n += fn.length;
    }

    // Compiled function
    return (value) => fns.reduce(apply, value);
}

function createCodePipe(code, names) {
    if (!names.length) { return code; }
    const name   = names.shift();
    const fn     = api[name];
    return createCodePipe(name + '(' + names.splice(0, fn.length - 1).join(',') + ',' + code + ')', names); 
}

function createCode(name, array) {
    return createCodePipe(name, array, 0);        
}

function createFunction(array) {
    if (!array.length) { return noop; }

    // Create scope object that includes non primitive pipe 
    // parameters as $1, $2...
    const scope = {};
    const names = [];
    var n = -1;
    var fn, name, length, type;
    while ((name = array[++n])) {
        names.push(name);

        fn = scope[name] = api[name];
        length = fn.length - 1;

        while(length--) {
            name = array[++n];
            type = typeof name;

            if (name && type === 'object') {
                scope['$' + n] = name;
                names.push('$' + n);
            }
            else if (type === 'string') {
                names.push('"' + name + '"');
            }
            else {
                names.push(name);
            }
        }
    }

    const code = createCode('value', names);
    // Pass an object as context to get an arrow function
    return compileFunction(scope, 'value', code, nothing);
}

function methodify(prototype, name, fn) {
    if (prototype[name]) {
        console.warn('Pipe overriding pipe.' + name + '()');
    }

    if (illegal[name]) {
        throw new Error('Pipe cannot declare pipe .' + name + '');
    }

    api[name] = fn;

    // Enable Pipe(8).name()
    prototype[name] = overload(function thisState() {
        // Sanity check arguments
        if (DEBUG && arguments.length < (fn.length - 1)) {
            throw new Error('.' + name + '() requires at least ' + (fn.length - 1) + ' params');
        }

        return this.state;
    }, {
        // Hot pipes
        'active': function(...params) {
            // Check for undefined so we can make pipes filterable
            if (this.value !== undefined) {
                this.value = fn(...params, this.value);
            }

            return this;
        },

        // Dead pipes
        'done': self,

        // Cold pipes, active pipes, any other state pipes
        default: function(...params) {    
            // Update this.data
            this.data.push(name);
            this.data.push.apply(this.data, arguments);    
            return this;
        }
    });

    // Enable Pipe.name(2) as shorthand for Pipe.of().name(2)
    Pipe[name] = function(...params) {
        const pipe = new Pipe();
        return pipe[name].apply(pipe, arguments);
    };

    // Enable use as reducer
    return prototype;
}

export function register(object) {
    Object.entries(object).forEach((entry) => methodify(Pipe.prototype, entry[0], entry[1]));
    return object;
}


/**
new Pipe(function|value)

Pipes created with a value are hot pipes - their .valueOf() is the current
value in the process. Pipes created with a function or nothing at all are cold
pipes. They are (frozen, compiled) and executed when pipe.fn(value) is called.
They are also cached.
**/

export default function Pipe(value) {
    // Support use without `new` keyword
    if (!Pipe.prototype.isPrototypeOf(this)) {
        return new Pipe(value);
    }

    if (value === undefined) {
        this.data = [] ;
    }
    else if (typeof value === 'function') {
        this.data = ['map', fn] ;
    }
    else {
        // Flag state as hot pipe
        this.state = 'active';
        this.value = value;
    }
}

export const prototype = Pipe.prototype;

Object.assign(Pipe, {
    of: (value) => new Pipe(value),

    from: (fn) => (
        // Is it JSON?
        typeof fn === 'string' ?
            new Pipe(api[fn] || (api[fn] = createFunction(JSON.parse(fn)))) :
        // Is a it a function ?
        typeof fn === 'function' ?
            new Pipe(fn) :
        // Is it a data array ?
        fn.length ?
            (api[JSON.stringify(fn)] || (api[fn] = createFunction(fn))) :
        // Is it a pipe ?
        Pipe.prototype.isPrototypeOf(fn) ?
            new Pipe(fn.fn) :
        (() => {
            throw new Error('Pipe.from() does not accept ' + (typeof fn) + ' ' + fn);
        })() 
    )
});

Object.assign(Pipe.prototype, {
    each: function(fn) {
        if (arguments.length < 1) {
            throw new Error('.each() requires a fn param');
        }

        // If this has value, it's a hot pipe and are executing immediately. 
        // No time to cache! Taps are not added to data.
        if (this.value !== undefined) {
            fn(this.value);
        }
        else {
            // Each should perhaps invalidate data, actually... you can't 
            // cache it
            this.data.push(name);
            this.data(this.data, (value) => (fn(value), undefined));
        }

        return this;
    },

    toString: function() {
        if (this.value !== undefined) {
            return '' + this.value;
        }

        // Prevent further modifications
        Object.freeze(this.data);

        // The presence of json means this pipe is finished, ready to be consumed
        return this.json || (this.json = JSON.stringify(this.data));
    },

    valueOf: function() {
        return this.value;
    },

    toJSON: function() {
        return this.data;
    }
});

Object.defineProperties(Pipe.prototype, {
    // Accessing .fn freezes the pipe data and caches the pipe as a function
    fn: {
        get: function() {
            const string = this.toString();
            const fn = api[string] || (api[string] = createFunction(this.data));
            // Overwrite instance this.fn so it always gets fn
            Object.defineProperty(this, 'fn', { value: fn });
            return fn;
        }
    },

    code: {
        get: function() {
            const code = createCode('value', this.data);
            // Overwrite instance this.fn so it always gets fn
            Object.defineProperty(this, 'code', { value: code });
            return code;
        }
    }
});

Object.entries(api).reduce((object, entry) => methodify(object, entry[0], entry[1]), Pipe.prototype);
