
import Producer from '../modules/stream/producer.js';
import Stream   from '../modules/stream.js';

import { isMuteable, getTarget, getTrap } from './observer.js';

const assign = Object.assign;
const rkey   = /(^\.?|\.)\s*([\w-]*)\s*/g;


function push(value) {
    this.producer.push(value);
}

function PathObserver(path, index, target, producer) {
    if (window.DEBUG && !path.length) {
        throw new SyntaxError('observe() path is empty');
    }

    // Parse path
    rkey.lastIndex = index;
    const p = rkey.exec(path);

    // Check that path is valid
    if (window.DEBUG && !p) {
        throw new SyntaxError('observe() path "' + path + '" cannot be parsed at "' + path.slice(index) + '"');
    }

    // Check that if there is no key we are being instructed to observe all
    // mutations via a '.' at the end of path - should not happen
    if (window.DEBUG && !p[2] && p[1] !== '.') {
        throw new SyntaxError('observe() path "' + path + '" must end with "."');
    }

    this.path     = path;
    this.target   = target;
    this.producer = producer;
    this.key      = p[2] || p[1];
    this.index    = rkey.lastIndex;
    this.isMuteableObserver = this.path.slice(this.index) === '.';

    // Are we at the end of the path? .push() can go straight to the producer.
    if (this.index >= this.path.length) {
        this.push = push;
    }

    // Bind observer to proxy
    this.listen();
    this.push(this.key === '.' ? this.target : this.target[this.key]);
}

assign(PathObserver.prototype, {
    push: function(value) {
        // We already know that we are not at path end here, as this.push is
        // replaced with a consumer at path end (in the constructor).

        // If the value is not muteable according to observer, we have no
        // business observing it
        if (!isMuteable(value)) {
            if (this.child) {
                this.child.stop();
                this.child = undefined;
            }

            // We are not at path end, and have just received an object that
            // cannot have observable deep properties. If we are observing a
            // muteable at path end ('.'), push it, otherwise undefined.
            // Todo: make it so PathObserver can jump into immutable objects?
            this.producer.push(this.isMuteableObserver ? value : undefined);
        }
        else if (this.child) {
            this.child.relisten(value);
        }
        else {
            this.child = new PathObserver(this.path, this.index, value, this.producer);
        }
    },

    listen: function() {
        const trap = getTrap(this.target);

        if (trap) {
            trap.listen(this.key, this);
        }
        else {
            console.log('observe() cannot get trap of ', this.target);
        }
    },

    unlisten: function() {
        getTrap(this.target).unlisten(this.key, this);
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
    }
});


/**
PathProducer(path, target, currentValue)
**/

function pushAllowUndefined(stream, value) {
    // Stream.push rejects undefined, but for this stream we want to allow
    // undefined. We could do this with Stream(..., options). We could. Let's
    // override .push() for the moment.
    stream[0].push(value);
}

function PathProducer(path, target, value) {
    this.path   = path;
    this.target = target;
    this.value  = value;
}

assign(PathProducer.prototype, Producer.prototype, {
    push: function(value) {
        // Deduplicate values
        if (this.value === value) {
            // If this is a mutation observer (path ends with '.') inspect
            // values: we want to allow muteable objects to pass through
            if (!this.isMutationProducer) { return; }
            if (!isMuteable(value)) { return; }
        }

        this.value = value;
        pushAllowUndefined(this[0], value);
    },

    pipe: function(stream) {
        this[0] = stream;
        this.pathObserver = new PathObserver(this.path, 0, this.target, this);

        // This flag is set here so that `initial` value *is* deduplicated
        // but subsequent mutations are *not*.
        this.isMutationProducer = this.path[this.path.length - 1] === '.';
    },

    stop: function() {
        this.pathObserver.stop();
        Producer.prototype.stop.apply(this, arguments);
    }
});


/**
observe(path, object [, initial])
Returns a stream of values of `path` in `object`. A new value is emitted every
time any of the objects in `path` mutates to result in a new value at the end of
`path`. An initial value is emitted (synchronously) when the value at `path`
is not equal to `initial`.
**/

export default function observe(path, object, initial) {
    const target = getTarget(object);
    const value  = getTarget(initial);
    return new Stream(new PathProducer(path, target, value));
}
