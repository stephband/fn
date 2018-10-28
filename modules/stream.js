
import { each } from './lists/core.js';
import latest   from './latest.js';
import noop     from './noop.js';
import now      from './now.js';
import Timer    from './timer.js';
import toArray  from './to-array.js';
import choke    from './choke.js';
import Fn       from './functor.js';

var debug     = false;
var A         = Array.prototype;
var assign    = Object.assign;


// Functions

function call(value, fn) {
    return fn(value);
}

function apply(values, fn) {
    return fn.apply(null, values);
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


// Events

var $events = Symbol('events');

function notify(type, object) {
    var events = object[$events];

    if (!events) { return; }
    if (!events[type]) { return; }

    var n = -1;
    var l = events[type].length;
    var value;

    while (++n < l) {
        value = events[type][n](type, object);
        if (value !== undefined) {
            return value;
        }
    }
}

function createNotify(stream) {
    var _notify = notify;

    return function trigger(type) {
        // Prevent nested events, so a 'push' event triggered while
        // the stream is 'pull'ing will do nothing. A bit of a fudge.
        var notify = _notify;
        _notify = noop;
        var value = notify(type, stream);
        _notify = notify;
        return value;
    };
}


// Sources
//
// Sources that represent stopping and stopped states of a stream

var doneSource = {
    shift: noop,
    push:  noop,
    start: noop,
    stop:  noop
};

function StopSource(source, n, done) {
    this.source = source;
    this.n      = n;
    this.done   = done;
}

assign(StopSource.prototype, doneSource, {
    shift: function() {
        if (--this.n < 1) { this.done(); }
        return this.source.shift();
    }
});


// Stream

export default function Stream(Source, options) {
    // Enable construction without the `new` keyword
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(Source, options);
    }

    var stream  = this;
    var getSource;

    var promise = new Promise(function(resolve, reject) {
        var source;

        function done() {
            stream.status = 'done';
            source = doneSource;
        }

        function stop(n, value) {
            // Neuter events and schedule shutdown of the stream
            // after n values
            delete stream[$events];

            if (n) { source = new StopSource(source, n, done); }
            else { done(); }

            // Note that we cannot resolve with stream because Chrome sees
            // it as a promise (resolving with promises is special)
            resolve(value);
        }

        getSource = function() {
            var notify = createNotify(stream);
            source = new Source(notify, stop, options);

            // Check for sanity
            if (debug) { checkSource(source); }

            // Gaurantee that source has a .stop() method
            if (!source.stop) { source.stop = noop; }

            getSource = function() { return source; };

            return source;
        };
    });

    // Properties and methods

    this[$events] = {};

    this.push = function push() {
        var source = getSource();
        source.push.apply(source, arguments);
        return stream;
    };

    this.shift = function shift() {
        return getSource().shift();
    };

    this.start = function start() {
        var source = getSource();
        source.start.apply(source, arguments);
        return stream;
    };

    this.stop = function stop() {
        var source = getSource();
        source.stop.apply(source, arguments);
        return stream;
    };

    this.then = promise.then.bind(promise);
}


// Buffer Stream

function BufferSource(notify, stop, list) {
    const buffer = list === undefined ? [] :
        Fn.prototype.isPrototypeOf(list) ? list :
        Array.from(list).filter(isValue) ;

    this._buffer = buffer;
    this._notify = notify;
    this._stop   = stop;
}

assign(BufferSource.prototype, {
    shift: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        return buffer.length ? buffer.shift() : notify('pull') ;
    },

    push: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        buffer.push.apply(buffer, arguments);
        notify('push');
    },

    stop: function() {
        var buffer = this._buffer;
        this._stop(buffer.length);
    }
});

Stream.from = function BufferStream(list) {
    return new Stream(BufferSource, list);
};

Stream.of = function ArgumentStream() {
    return Stream.from(arguments);
};


// Promise Stream

function PromiseSource(notify, stop, promise) {
    const source = this;

    promise
    // Todo: Put some error handling into our streams
    .catch(stop)
    .then(function(value) {
        source.value = value;
        notify('push');
        stop();
    });
}

PromiseSource.prototype.shift = function() {
    const value = this.value;
    this.value = undefined;
    return value;
};

Stream.fromPromise = function(promise) {
    return new Stream(PromiseSource, promise);
};


// Callback stream

Stream.fromCallback = function(object, name) {
    const stream = Stream.of();
    const args = rest(2, arguments);
    args.push(stream.push);
    object[name].apply(object, args);
    return stream;
};

// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    const source = this;

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
            this.notify('push');
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }
        else {
            event.t2 = time;
            this.notify('push');
            // Todo: We need this? Test.
            this.value     = undefined;
            this.requestId = this.timer.request(this.frame);
        }
    }
});

Stream.fromTimer = function TimeStream(timer) {
    return new Stream(TimeSource, timer);
};

Stream.fromDuration = function(duration) {
    return Stream.fromTimer(new Timer(duration));
};

Stream.frames = function() {
    return Stream.fromTimer(frameTimer);
};




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

        source.on('push', listen)
        source.on('push', notify);
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
            source.off('push', listen);
            source.off('push', notify);
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
    var buffer = [];

    function update(type, source) {
        buffer.push(source);
    }

    this._notify  = notify;
    this._stop    = stop;
    this._sources = sources;
    this._values  = values;
    this._buffer  = buffer;
    this._i       = 0;
    this._update  = update;

    each(function(source) {
        // Flush the source
        values.push.apply(values, toArray(source));

        // Listen for incoming values
        source.on('push', update);
        source.on('push', notify);
    }, sources);
}

assign(MergeSource.prototype, {
    shift: function() {
        var sources = this._sources;
        var values  = this._values;
        var buffer  = this._buffer;
        var stop    = this._stop;

        if (values.length) { return values.shift(); }
        var stream = buffer.shift();
        if (!stream) { return; }
        var value = stream.shift();
        // When all the sources are empty, stop
        if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
        return value;
    },

    stop: function() {
        var notify  = this._notify;
        var sources = this._sources;
        var stop    = this._stop;
        var update  = this._update;

        // Remove listeners
        each(function(source) {
            source.off('push', update);
            source.off('push', notify);
        }, sources);

        stop(values.length + buffer.length);
    }
});

Stream.Merge = function(source1, source2) {
    var args = arguments;

    return new Stream(function setup(notify, stop) {
        return new MergeSource(notify, stop, Array.from(args));
    });
};





// Stream Timers

Stream.Choke = function(time) {
    return new Stream(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify('push');
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
        notify('push');
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


// Stream Methods

Stream.prototype = assign(Object.create(Fn.prototype), {
    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        var stream  = new Stream(function setup(notify, stop) {
            var buffer = buffer2;

            source.on('push', notify);

            return {
                shift: function() {
                    if (buffer.length) { return buffer.shift(); }
                    var value = shift();

                    if (value !== undefined) { buffer1.push(value); }
                    else if (source.status === 'done') {
                        stop(0);
                        source.off('push', notify);
                    }

                    return value;
                },

                stop: function() {
                    var value;

                    // Flush all available values into buffer
                    while ((value = shift()) !== undefined) {
                        buffer.push(value);
                        buffer1.push(value);
                    }

                    stop(buffer.length);
                    source.off('push', notify);
                }
            };
        });

        this.then(stream.stop);

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }
            var value = shift();
            if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
            return value;
        };

        return stream;
    },

    combine: function(fn, source) {
        return Stream.Combine(fn, this, source);
    },

    merge: function() {
        var sources = toArray(arguments);
        sources.unshift(this);
        return Stream.Merge.apply(null, sources);
    },

    choke: function(time) {
        return this.pipe(Stream.Choke(time));
    },

    throttle: function(timer) {
        return this.pipe(Stream.throttle(timer));
    },

    clock: function(timer) {
        return this.pipe(Stream.clock(timer));
    },


    // Consume

    each: function(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        return this.on('push', function each() {
            // Delegate to Fn#each().
            Fn.prototype.each.apply(source, args);
        });
    },

    pipe: function(stream) {
        this.each(stream.push);
        return Fn.prototype.pipe.apply(this, arguments);
    },


    // Events

    on: function(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        var listeners = events[type] || (events[type] = []);
        listeners.push(fn);
        return this;
    },

    off: function off(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        // Remove all handlers for all types
        if (arguments.length === 0) {
            Object.keys(events).forEach(off, this);
            return this;
        }

        var listeners = events[type];
        if (!listeners) { return; }

        // Remove all handlers for type
        if (!fn) {
            delete events[type];
            return this;
        }

        // Remove handler fn for type
        var n = listeners.length;
        while (n--) {
            if (listeners[n] === fn) { listeners.splice(n, 1); }
        }

        return this;
    }
});
