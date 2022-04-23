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

import { $observer, Observer, analytics, getTarget } from './observer.js';

const assign = Object.assign;

const rkey = /(^\.?|\.)\s*([\w-]*)\s*/g;

function Observe(path, index, target, output) {
    if (!path.length) {
        throw new Error('Path is empty!');
    }

    // Parse path
    rkey.lastIndex = index;
    const p = rkey.exec(path);

    // Check that path is valid
    if (!p) {
        throw new Error('Cant parse path "' + this.path + '" at "' + this.path.slice(index) + '"');
    }

    this.target     = target;
    this.firstIndex = index;
    this.lastIndex  = rkey.lastIndex;
    this.path       = path;
    this.parsed     = path.slice(this.firstIndex, this.lastIndex);
    this.output     = output;

    // Are we at the end of the path?
    if (this.lastIndex >= this.path.length) {
        this.push = this.output;
    }

    if (!p[2]) {
        // Check that if there is no key we are being instructed to observe all
        // mutations via a '.' at the end of path (TODO)
        if (p[1] !== '.') {
            throw new Error('Path must end with "." (', p[1], path, ')');
        }

        this.key = '.';
        this.listen();
        this.push(this.target);
    }
    else {
        this.key = p[2];
        this.listen();
        this.push(this.target[this.key]);
    }

    if (window.DEBUG) { ++analytics.observes; }
}

assign(Observe.prototype, {
    push: function(value) {
        const type = typeof value;

        // We already know that we are not at path end here, as this.push is
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
            this.child.relisten(value);
        }
        else {
            this.child = new Observe(this.path, this.lastIndex, value, this.output);
        }

        // If this.child.key is '.' we have a problem
        if (this.child.key === '.') {
            throw new Error('Arrrrgh');
        }
    },

    listen: function() {
        const observer = Observer(this.target);

        if (!observer) {
            if (window.DEBUG) {
                console.log('CANNOT LISTEN TO UNOBSERVABLE', this.target);
            }

            return;
        }

        this.target[$observer].listen(this.key, this);
    },

    unlisten: function() {
        this.target[$observer].unlisten(this.key, this);
    },

    relisten: function(target) {
        this.unlisten();
        this.target = target;
        this.listen();
        this.push(this.target[this.key]);
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

function PathProducer(path, target, value) {
    this.path   = path;
    this.target = target;
    this.value  = value === undefined ? null : value ;
    // Where we are not observing mutations we want to deduplicate output values
    // Todo: we do still want to deduplicate undefined, however
    this.dedup  = path[path.length - 1] !== '.';
}

assign(PathProducer.prototype, Producer.prototype, {
    push: function(value) {
        value = value === undefined ? null : value ;
        if (this.dedup && value === this.value) { return; }
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
    const target = getTarget(object);
    const value  = getTarget(initial);
    return new Stream(new PathProducer(path, target, value));
}
