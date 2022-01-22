
import id      from '../modules/id.js';
import noop    from '../modules/noop.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/**
Stream()
**/

const properties = {
    source: { writable: true },
    target: { writable: true }
};


function stopOne(stopable) {
    return stopable.stop ?
        stopable.stop() :
        stopable() ;
}

function stopAll(stopables) {
    stopables.forEach(stopOne);
    stopables.length = 0;
}

function pushError() {
    throw new Error('Attempted stream.push() to a stopped stream');
}

function startError() {
    throw new Error('Attempted stream.start() but stream already started');
}


/* Source */

function Source(stream, start) {
    this.stream = stream;
    this.setup  = start;
}

assign(Source.prototype, {
    start: function() {
        // Method may be used once only
        if (window.DEBUG) { this.start = startError; }

        const start  = this.fn;
        this.setup(this.stream, arguments);

        // Update count of running streams
        ++Stream.count;
    },

    stop: function stop() {
        // Cannot push() after stop()
        if (window.DEBUG) { this.push = pushError; }

        this.stopables && stopAll(this.stopables);
        // Update count of running streams
        --Stream.count;
    },

    done: function done(fn) {
        const stopables = this.stopables || (this.stopables = []);
        stopables.push(fn);
    }
});


/* Stream */

export default function Stream(start) {
    // Support construction without `new`
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(start);
    }

    this.source = typeof start === 'function' ?
        // New source calls start(source) when the stream is started
        new Source(this, start) :
        // Also Accept a producer stream as source. It will be started, stopped
        // and done when this stream is started, stopped and done.
        start ;

}

assign(Stream, {
    /**
    .count
    Keeps a count of unstopped streams. This may help you identify when
    something is not stopping correctly in your code.
    **/
    count: 0,

    /**
    Stream.from(values)
    **/
    from: function(values) {
        return new Stream(values.length ?
            (controller) => controller.push.apply(controller, values) :
            noop
        );
    },

    /**
    Stream.of(value1, value2, ...)
    **/
    of: function() {
        return this.from(arguments);
    }
});

assign(Stream.prototype, {
    /**
    .push()
    **/
    push: function() {
        const target = this.target;

        // If there is no target the stream has not been started yet
        if (window.DEBUG && !target) {
            throw new Error('Cannot .push() to unstarted stream');
        }

        const length = arguments.length;
        let n = -1;
        while (++n < length) {
            arguments[n] !== undefined && target.push(arguments[n]);
        }

        return this;
    },

    /**
    .map()
    **/
    map: function(fn) {
        return this.target = new Map(this.source, fn);
    },

    /**
    .filter()
    **/
    filter: function(fn) {
        return this.target = new Filter(this.source, fn);
    },

    /**
    .reduce()
    Consumes the stream, returns a promise of the accumulated value.
    **/
    reduce: function(fn, accumulator) {
        return this.pipe(new Reduce(this.source, fn, accumulator));
    },

    /**
    .scan()
    **/
    scan: function(fn, accumulator) {
        return this.target = new Scan(this.source, fn, accumulator);
    },

    /**
    .take()
    **/
    take: function(n) {
        return this.target = new Take(this.source, n);
    },

    /**
    .each()
    **/
    each: function(fn) {
        return this.pipe(new Each(this.source, fn));
    },

    /**
    .pipe()
    **/
    pipe: function(target) {
        //target.done && target.done(this);
        this.target = target;
        this.start();
        return target;
    },

    /**
    .start()
    **/
    start: function() {
        this.source.start.apply(this.source, arguments);
        return this;
    },

    /**
    .stop()
    **/
    stop: function() {
        this.source.stop.apply(this.source, arguments);
        return this;
    },

    /**
    .done()
    **/
    done: function(fn) {
        this.source.done(fn);
        return this;
    }
});


/*
Map()
*/

const mapProperties = assign({ fn: { value: id }}, properties);

function Map(source, fn) {
    mapProperties.source.value = source;
    mapProperties.fn.value = fn;
    define(this, mapProperties);
}

Map.prototype = create(Stream.prototype);

Map.prototype.push = function map(value) {
    value = this.fn(value);

    if (v !== undefined) {
        this.target.push(value);
    }

    return this;
};


/*
Filter()
*/

function Filter(source, fn) {
    mapProperties.source.value = source;
    mapProperties.fn.value = fn;
    define(this, mapProperties);
}

Filter.prototype = create(Stream.prototype);

Filter.prototype.push = function filter(value) {
    if (this.fn(value)) {
        this.target.push(value);
    }

    return this;
};


/*
Take()
*/

const takeProperties = assign({ n: { value: 0, writable: true }}, properties);

function Take(source, n) {
    if (typeof n !== 'number' || n < 1) {
        throw new Error('stream.take(n) accepts non-zero positive integers as n (' + n + ')');
    }

    takeProperties.source.value = source;
    takeProperties.n.value = n;
    define(this, takeProperties);
}

Take.prototype = create(Stream.prototype);

Take.prototype.push = function take(value) {
    this.target.push(value);

    if (!(--this.n)) {
        this.stop();
    }

    return this;
};


/*
Reduce()
*/

const reduceProperties = assign({
    value: { writable: true }
}, mapProperties);

function Reduce(source, fn, accumulator) {
    reduceProperties.source.value = source;
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
}

Reduce.prototype = create(Stream.prototype);

Reduce.prototype.push = function reduce(value) {
    if (value !== undefined) {
        this.value = this.fn(this.value, value);
    }

    return new Promise((resolve, reject) => {
        this.done(() => resolve(this.value));
    });
};


/*
Scan()
*/

function Scan(source, fn, accumulator) {
    reduceProperties.source.value = source;
    reduceProperties.fn.value = fn;
    reduceProperties.value.value = accumulator;
    define(this, reduceProperties);
}

Scan.prototype = create(Stream.prototype);

Scan.prototype.push = function scan(value) {
    value = this.fn(this.value, value);

    if (value !== undefined) {
        this.value = value;
        this.target.push(value);
    }

    return this;
};


/*
Each()
*/

const eachProperties = {
    source: { writable: true }
};

function Each(source, fn) {
    eachProperties.source.value = source;
    define(this, eachProperties);
    this.push = fn;
}

Each.prototype = create(Stream.prototype, {
    // Can't consume a consumed stream
    each: { value: null },
    pipe: { value: null }
});


// Debug

if (window.DEBUG) {
    window.Stream = Stream;
}
