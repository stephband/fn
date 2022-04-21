/**
Observe()
An object whose fn is called by the proxy traps set and delete when a value
changes. This object is internal-only.

```
.path   - full observable path
.index  - index of path consumed
.target - observer target object
.key    - last parsed key from path
```

**/

import Producer from '../modules/stream/producer.js';
import Stream   from '../modules/stream.js';

import { Observer, analytics, remove, getTarget, getObservables, getMutationObservables } from './observer.js';

const assign = Object.assign;

const rkey = /(^\.?|\.)\s*([\w-]*)\s*/g;

function Observe(path, index, target, output) {
    if (!path.length) {
        throw new Error('Path is empty!');
    }

    // Parse path
    rkey.lastIndex = index;
    const r = rkey.exec(path);

    // Check that path is valid
    if (!r) {
        throw new Error('Cant parse path ' + this.path + ' at index ' + this.index);
    }

    this.target = target;
    this.path   = path;
    this.index  = rkey.lastIndex;
    this.output = output;

    // Are we at the end of the path?
    if (this.index >= this.path.length) {
        this.fn = this.output;
    }

    if (!r[2]) {
        // Check that if there is no key we are being instructed to observe all
        // mutations with a '.' at the end of path (TODO)
        if (r[1] !== '.') {
            throw new Error('Path must end with "." (', r[1], path, ') Todo: observe all mutations');
        }

        this.key = '.';
        this.listen();
        this.fn(this.target);
    }
    else {
        this.key    = r[2];
        this.listen();
        this.fn(this.target[this.key]);
    }

    if (window.DEBUG) { ++analytics.observes; }
}

assign(Observe.prototype, {
    fn: function(value) {
        const type = typeof value;

        // We already know that we are not at path end here, as this.fn is
        // replaced with a consumer at path end (in the constructor).

        // If the value is immutable we have no business observing it
        if (!value || (type !== 'object' && type !== 'function')) {
            if (this.child) {
                this.child.stop();
                this.child = undefined;
            }

            // We are not at path end, and have just received an object that
            // cannot have deep properties, so value must be undefined
            this.output(undefined);
            return;
        }

        if (this.child) {
            this.child.unlisten();
            this.child.target = value;
            this.child.listen();
            //this.child.fn(value);
        }
        else {
            this.child = new Observe(this.path, this.index, value, this.output);
        }

        // If this.child.key is '.' we have a problem
        if (this.child.key === '.') {
            throw new Error('Arrrrgh');
        }

        this.child.fn(value[this.child.key]);
    },

    listen: function() {
        const observer = Observer(this.target);

        if (!observer) {
            if (window.DEBUG) {
                console.log('CANNOT LISTEN TO UNOBSERVABLE', this.target);
            }

            return;
        }

        const observables = this.key === '.' ?
            getMutationObservables(this.target) :
            getObservables(this.key, this.target) ;

        if (observables.includes(this)) {
            throw new Error('observe.listen this is already bound');
        }

        observables.push(this);
    },

    unlisten: function() {
        const observables = this.key === '.' ?
            getMutationObservables(this.target) :
            getObservables(this.key, this.target) ;

        remove(observables, this);
    },

    stop: function() {
        this.unlisten();
        this.child && this.child.stop();
        this.child = undefined;
        if (window.DEBUG) { --analytics.observes; }
    }
});


/**
Observable(path, target, currentValue)
**/

function ObserveProducer(path, target, value) {
    this.path   = path;
    this.target = target;
    this.value  = value;
}

assign(ObserveProducer.prototype, Producer.prototype, {
    push: function(value) {
        if (value === this.value) { return; }
        this.value = value;
        this[0].push(value);
    },

    pipe: function(stream) {
        this[0] = stream;
        this.observe = new Observe(this.path, 0, this.target, (value) => this.push(value));
    },

    stop: function() {
        this.observe.stop();
        Producer.prototype.stop.apply(this, arguments);
    }
});

export default function observe(path, object, initial) {
    return new Stream(new ObserveProducer(path, getTarget(object), getTarget(initial)));
}
