
const DEBUG = window.DEBUG === true;

/** 
Stream

```
.each(fn)
.pipe(consumer)
.stop()
```
**/

const assign = Object.assign;

function create(object, fn) {
    var functor = Object.create(object);
    functor.shift = fn;
    return functor;
}

function start(observable, consumer, current) {
    
}

function Stream(generator) {
    if (DEBUG) {
        if (arguments.length > 2) {
            throw new Error('Stream(setup, buffer) takes 2 arguments. Recieved ' + arguments.length + '.');
        }
    }
    
    // Enable construction without the `new` keyword
    if (!Stream.prototype.isPrototypeOf(this)) {
        return new Stream(generator);
    }

    // Privates
    /*
    const privates = Privates(this);
    privates.stream  = this;
    privates.events  = [];
    privates.resolve = noop;
    privates.source  = new StartSource(this, privates, Source, buffer);
    */

    // Methods
    this.shift = function shift() {
        const next = generator.next();

        if (next.done) {
            this.stop();
            return;
        }

        return next.value;
    };
}

function* map(source, fn) {
    let next = nothing;
    while (!next.done) {
        next = source.next();
        yield next.value === undefined ? undefined : fn(next.value);
    }
}

assign(Stream.prototype, {
    
    // Modify
    
    map: function(fn) {
        return create(this, (value) => (value === undefined ?
            undefined :
            fn(value) 
        ));
    },

    // Consume

    each: function(fn) {
        this.producer = start(this, fn);
        return this;
    },

    pipe: function(consumer) {
        this.producer = start(this, consumer);
        return consumer;
    },

    // Control

    stop: function() {
        return this;
    }
});



new Stream(function* Iterable(notify, stop) {
    notify();
    yield value;
});
