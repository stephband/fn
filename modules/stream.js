
import { each } from './lists/core.js';
import latest   from './latest.js';
import noop     from './noop.js';
import nothing  from './nothing.js';
import now      from './now.js';
import remove   from './lists/remove.js';
import Timer    from './timer.js';
import toArray  from './to-array.js';
import choke    from './choke.js';
import Privates from './privates.js';
import Fn, { create } from './fn.js';

var debug     = false;
var A         = Array.prototype;
var assign    = Object.assign;


function call(value, fn) {
    return fn(value);
}

function isValue(n) { return n !== undefined; }

function isDone(stream) {
    return stream.status === 'done';
}

function checkSource(source) {
    // Check for .shift()
    if (!source.shift) {
        throw new Error('Stream: Source must create an object with .shift() ' + source);
    }
}

function notify(object) {
    var events = Privates(object).events;
    if (!events) { return; }

    var n = -1;
    var l = events.length;
    var value;

    while (++n < l) {
        value = events[n](object);
        if (value !== undefined) { return value; }
    }
}

function done(stream, privates) {
    stream.status = 'done';
    privates.source = nothing;
    privates.resolve();
}

function createSource(stream, privates, options, Source) {
    function note() {
        notify(stream);
    }

    function stop(n) {
        // Neuter events
        delete privates.events;

        // If no n, shut the stream down
        if (!n) {
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
            done(stream, privates);
        }

        // Schedule shutdown of stream after n values
        else {
            privates.source = new StopSource(stream, privates.source, privates, n, done);
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
        }
    }

    const source = new Source(note, stop, options);

    // Check for sanity
    if (debug) { checkSource(source); }

    // Gaurantee that source has a .stop() method
    if (!source.stop) { source.stop = noop; }

    return (privates.source = source);
}

function shiftBuffer(shift, state, one, two, buffer) {
    if (buffer.length && state.buffered === one) {
        return buffer.shift();
    }

    const value = shift();
    if (value === undefined) { return; }

    buffer.push(value);
    state.buffered = two;
    return value;
}

// StartSource

function StartSource(stream, privates, options, Source) {
    this.stream   = stream;
    this.privates = privates;
    this.options  = options;
    this.Source   = Source;
}

assign(StartSource.prototype, {
    create: function() {
        return createSource(this.stream, this.privates, this.options, this.Source, () => this.stop());
    },

    shift: function shift() {
        return this.create().shift();
    },

    push: function push() {
        const source = this.create();
        if (!source.push) { throw new Error('Attempt to .push() to unpushable stream'); }
        source.push.apply(source, arguments);
    },

    start: function start() {
        const source = this.create();
        if (!source.start) { throw new Error('Attempt to .start() unstartable stream'); }
        source.start.apply(source, arguments);
    },

    stop: function done() {
        const source = this.create();

        if (!source.stop) {
            done(this.stream, this.privates);
        }

        source.stop.apply(source, arguments);
    }
});


// StopSource

function StopSource(stream, source, privates, n, done) {
    this.stream   = stream;
    this.source   = source;
    this.privates = privates;
    this.n        = n;
    this.done     = done;
}

assign(StopSource.prototype, nothing, {
    shift: function() {
        const value = this.source.shift();
        if (--this.n < 1) { this.done(this.stream, this.privates); }
        return value;
    },

    start: function() {
        throw new Error('Cannot .start() stopped stream');
    },

    push: function() {
        throw new Error('Cannot .push() to stopped stream');
    }
});


// BufferSource

function BufferSource(notify, stop, list) {
    const buffer = list === undefined ? [] :
        Fn.prototype.isPrototypeOf(list) ? list :
        Array.from(list).filter(isValue) ;

    this.buffer = buffer;
    this.notify = notify;
    this.stopfn = stop;
}

assign(BufferSource.prototype, {
    shift: function() {
        return this.buffer.shift();
    },

    push: function() {
        this.buffer.push.apply(this.buffer, arguments);
        this.notify();
    },

    stop: function() {
        this.stopfn(this.buffer.length);
    }
});

/* Construct */

/*
Stream(fn)
Construct a new stream. The `new` keyword is optional. `fn(notify, stop)` is
invoked when the stream is started: it must return a source object – a
'producer' – with the method `.shift()` and optionally methods `.push()`,
`.start()` and `.stop()`.
*/

export default function Stream(Source, options) {
    // Enable construction without the `new` keyword
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(Source, options);
    }

    // Privates

    const privates = Privates(this);
    privates.stream  = this;
    privates.events  = [];
    privates.resolve = noop;
    privates.source  = new StartSource(this, privates, options, Source);

    // Methods

    this.shift = function shift() {
        return privates.source.shift();
    };

    // Keep it as an instance method for just now
    this.push = function push() {
        const source = privates.source;
        source.push.apply(source, arguments);
        return this;
    };
}

Stream.prototype = assign(Object.create(Fn.prototype), {
    constructor: Stream,

    /* Write */

    /*
    .push(value)
    Pushes a `value` (or multiple values) into the head of a writeable stream.
    If the stream is not writeable, it does not have a `.push()` method.
    */

    /* Map */

    ///*
    //.chunk(n)
    //Batches values into arrays of length `n`.
    //*/

    /*
    .flat()
    Flattens a stream of streams or arrays into a single stream.
    */

    /*
    .flatMap(fn)
    Maps values to lists – `fn(value)` must return an array, functor, stream
    (or any other duck with a `.shift()` method) and flattens those lists into a
    single stream.
    */

    /*
    .map(fn)
    Maps values to the result of `fn(value)`.
    */

    /*
    .merge(stream)
    Merges this stream with `stream`, which in fact may be an array, array-like
    or functor.
    */

    merge: function merge() {
        var sources = toArray(arguments);
        sources.unshift(this);
        return Stream.Merge.apply(null, sources);
    },

    /*
    .scan(fn, seed)
    Calls `fn(accumulator, value)` and emits `accumulator` for each value
    in the stream.
    */


    /* Filter */

    /*
    .dedup()
    Filters out consecutive equal values.
    */

    /*
    .filter(fn)
    Filter values according to the truthiness of `fn(value)`.
    */

    /*
    .latest()
    When the stream has a values buffered, passes the last value
    in the buffer.
    */

    /*
    .rest(n)
    Filters the stream to the `n`th value and above.
    */

    /*
    .take(n)
    Filters the stream to the first `n` values.
    */

    ///*
    //.clock(timer)
    //Emits values at the framerate of `timer`, one-per-frame. No values
    //are discarded.
    //*/
    //
    //clock: function clock(timer) {
    //    return this.pipe(Stream.clock(timer));
    //},

    /*
    .throttle(time)
    Throttles values such that the latest value is emitted every `time` seconds.
    Other values are discarded. The parameter `time` may also be a timer options
    object, an object with `{ request, cancel, now }` functions,
    allowing the creation of, say, and animation frame throttle.
    */

    throttle: function throttle(timer) {
        return this.pipe(Stream.throttle(timer));
    },

    /*
    .wait(time)
    Emits the latest value only after `time` seconds of inactivity.
    Other values are discarded.
    */

    wait: function wait(time) {
        return this.pipe(Stream.Choke(time));
    },

    combine: function(fn, source) {
        return Stream.Combine(fn, this, source);
    },


    /* Read */

    /*
    .clone()
    Creates a read-only copy of the stream.
    */

    clone: function clone() {
        const source = this;
        const shift  = this.shift.bind(this);
        const buffer = [];

        const state = {
            // Flag telling us which stream has been buffered,
            // source (1) or copy (2)
            buffered: 1
        };

        this.shift = function() {
            return shiftBuffer(shift, state, 1, 2, buffer);
        };

        return new Stream(function(notify, stop) {
            source.on(notify);
            source.done(stop);

            return {
                shift: function() {
                    return shiftBuffer(shift, state, 2, 1, buffer);
                },

                stop: function() {
                    stop(0);
                }
            }
        });
    },

    /*
    .each(fn)
    Thirstilly consumes the stream, calling `fn(value)` whenever
    a value is available.
    */

    each: function each(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        // Delegate to Fn#each().
        return this.on(() => Fn.prototype.each.apply(source, args));
    },

    /*
    .last(fn)
    Consumes the stream when stopped, calling `fn(value)` with the
    last value read from the stream.
    */

    last: function last(fn) {
        const privates = Privates(this);
        privates.stops = privates.stops || [];
        const value = this.latest().shift();
        value !== undefined && privates.stops.push(() => fn(value));
        return this;
    },

    /*
    .fold(fn, accumulator)
    Consumes the stream when stopped, calling `fn(accumulator, value)`
    for each value in the stream. Returns a promise.
    */

    fold: function fold(fn, accumulator) {
        // Fold to promise
        return new Promise((resolve, reject) => {
            this
            .scan(fn, accumulator)
            .last(resolve)
        });
    },

    ///*
    //.reduce(fn, accumulator)
    //Consumes the stream when stopped, calling `fn(accumulator, value)`
    //for each value in the stream. Returns a promise that resolves to
    //the last value returned by `fn(accumulator, value)`.
    //*/

    reduce: function reduce(fn, accumulator) {
        // Support array.reduce semantics with optional seed
        return accumulator ?
            this.fold(fn, accumulator) :
            this.fold((acc, value) => (acc === undefined ? value : fn(acc, value)), this.shift()) ;
    },

    /*
    .shift()
    Reads a value from the stream. If no values are in the stream, returns
    `undefined`. If this is the last value in the stream, `streams.status`
    is `'done'`.
    */

    /* Lifecycle */

    /*
    .done(fn)
    Calls `fn()` after the stream is stopped and all values have been drained.
    */

    done: function done(fn) {
        const privates = Privates(this);
        const promise = privates.promise || (
            privates.promise = this.status === 'done' ?
                Promise.resolve() :
                new Promise((resolve, reject) => assign(privates, { resolve, reject }))
        );

        promise.then(fn);
        return this;
    },

    /*
    .start()
    If the stream's producer is startable, starts the stream.
    */

    start: function start() {
        const source = Privates(this).source;
        source.start.apply(source, arguments);
        return this;
    },

    /*
    .stop()
    Stops the stream. No more values can be pushed to the stream and any
    consumers added will do nothing. However, depending on the stream's source
    the stream may yet drain any buffered values into an existing consumer
    before entering `'done'` state. Once in `'done'` state a stream is
    entirely inert.
    */

    stop: function stop() {
        const source = Privates(this).source;
        source.stop.apply(source, arguments);
        return this;
    },

    on: function on(fn) {
        if (typeof fn === 'string') {
            throw new Error('stream.on(fn) no longer takes type');
        }

        var events = Privates(this).events;
        if (!events) { return this; }

        events.push(fn);
        return this;
    },

    off: function off(fn) {
        if (typeof fn === 'string') {
            throw new Error('stream.off(fn) no longer takes type');
        }

        var events = Privates(this).events;
        if (!events) { return this; }

        // Remove all handlers
        if (!fn) {
            events.length = 0;
            return this;
        }

        // Remove handler fn for type
        var n = events.length;
        while (n--) {
            if (events[n] === fn) { events.splice(n, 1); }
        }

        return this;
    }
});


/*
Stream.from(values)
Returns a writeable stream that consumes the array or array-like `values` as
its source.
*/

Stream.from = function(list) {
    return new Stream(BufferSource, list);
};

/*
Stream.fromPromise(promise)
Returns a stream that uses the given promise as its source. When the promise
resolves the stream is given its value and stopped. If the promise errors
the stream is stopped without value. This stream is not writeable: it has no
`.push()` method.
*/

Stream.fromPromise = function(promise) {
    const stream = Stream.of();

    promise
    .then((value) => {
        stream.push(value);
        stream.stop();
    })
    .catch(() => stream.stop());

    return stream;
};

/*
Stream.fromProperty(name, object)
Returns a stream of mutations made to the `name` property of `object`,
assuming those mutations are made to the Observer proxy of object - see
[Observer](#observer).
*/


// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify();
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify();
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});


/*
Stream.fromTimer(timer)
Create a stream from a `timer` object. A `timer` is an object
with the properties:

```
{
    request:     fn(fn), calls fn on the next frame, returns an id
    cancel:      fn(id), cancels request with id
    now:         fn(), returns the time
    currentTime: time at the start of the latest frame
}
```

Here is how a stream of animation frames may be created:

```
const frames = Stream.fromTimer({
    request: window.requestAnimationFrame,
    cancel: window.cancelAnimationFrame,
    now: () => window.performance.now()
});
```

This stream is not writeable: it has no `.push()` method.
*/

Stream.fromTimer = function TimeStream(timer) {
    return new Stream(TimeSource, timer);
};


/*
Stream.of(...values)
Returns a writeable stream that uses arguments as its source.
*/

Stream.of = function() {
    return Stream.from(arguments);
};

//Stream.frames = function() {
//    return Stream.fromTimer(frameTimer);
//};




// Stream.Combine

function toValue(data) {
    var source = data.source;
    var value  = data.value;
    return data.value = value === undefined ? latest(source) : value ;
}

function CombineSource(notify, stop, fn, sources) {
    var object = this;

    this._notify  = notify;
    this._stop    = stop;
    this._fn      = fn;
    this._sources = sources;
    this._hot     = true;

    this._store = sources.map(function(source) {
        var data = {
            source: source,
            listen: listen
        };

        // Listen for incoming values and flag as hot
        function listen() {
            data.value = undefined;
            object._hot = true;
        }

        source.on(listen)
        source.on(notify);
        return data;
    });
}

assign(CombineSource.prototype, {
    shift: function combine() {
        // Prevent duplicate values going out the door
        if (!this._hot) { return; }
        this._hot = false;

        var sources = this._sources;
        var values  = this._store.map(toValue);
        if (sources.every(isDone)) { this._stop(0); }
        return values.every(isValue) && this._fn.apply(null, values) ;
    },

    stop: function stop() {
        var notify = this._notify;

        // Remove listeners
        each(function(data) {
            var source = data.source;
            var listen = data.listen;
            source.off(listen);
            source.off(notify);
        }, this._store);

        this._stop(this._hot ? 1 : 0);
    }
});

Stream.Combine = function(fn) {
    var sources = A.slice.call(arguments, 1);

    if (sources.length < 2) {
        throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
    }

    return new Stream(function setup(notify, stop) {
        return new CombineSource(notify, stop, fn, sources);
    });
};


// Stream.Merge

function MergeSource(notify, stop, sources) {
    var values = [];

    function update(source) {
        values.push.apply(values, toArray(source));
    }

    this.values  = values;
    this.notify  = notify;
    this.sources = sources;
    this.update  = update;
    this.cueStop = stop;

    each(function(source) {
        // Flush the source
        update(source);

        // Listen for incoming values
        source.on(update);
        source.on(notify);
    }, sources);
}

assign(MergeSource.prototype, {
    shift: function() {
        if (this.sources.every(isDone)) {
            this.stop();
        }

        return this.values.shift();
    },

    stop: function() {
        this.cueStop(this.values.length);
    }
});

Stream.Merge = function(source1, source2) {
    return new Stream(MergeSource, Array.from(arguments));
};


// Stream Timers

Stream.Choke = function(time) {
    return new Stream(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify();
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};


// Frame timer

var frameTimer = {
    now:     now,
    request: requestAnimationFrame.bind(window),
    cancel:  cancelAnimationFrame.bind(window)
};


// Stream timer

function StreamTimer(stream) {
    var timer = this;
    var fns0  = [];
    var fns1  = [];
    this.fns = fns0;

    stream.each(function() {
        timer.fns = fns1;
        fns0.reduce(call, undefined);
        fns0.length = 0;
        fns1 = fns0;
        fns0 = timer.fns;
    });
}

assign(StreamTimer.prototype, {
    request: function(fn) {
        this.fns.push(fn);
        return fn;
    },

    cancel: function(fn) {
        remove(this.fns, fn);
    }
});


// Stream.throttle

function schedule() {
    var timer   = this.timer;

    this.queue = noop;
    this.ref   = timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    var source   = this;

    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        source.queue = schedule;
        notify();
    };
}

assign(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream.throttle = function(timer) {
    if (typeof timer === 'function') {
        throw new Error('Dont accept request and cancel functions anymore');
    }

    timer = typeof timer === 'number' ?
        new Timer(timer) :
    timer instanceof Stream ?
        new StreamTimer(timer) :
    timer ? timer :
        frameTimer ;

    return new Stream(function(notify, stop) {
        return new ThrottleSource(notify, stop, timer);
    });
};
