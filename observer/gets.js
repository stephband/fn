
import { remove }             from '../modules/remove.js';
import Stream, { stop }       from '../modules/stream/stream.js';
import { getTrap, getTarget } from './observer.js';

//const DEBUG = window.DEBUG === true;

const assign = Object.assign;
const values = Object.values;
const record = {};

/**
gets(object)
Calls `fn` for every property of `object` read via a get operation. Returns an
object with the method `.stop()`.
**/

function invokeStop(object) {
    object.stop();
}

function GetProducer(target, path) {
    this.children = {};

    // For some reason child proxies are being set... dunno how...
    this.target = getTarget(target);
    this.path   = path;
}

assign(GetProducer.prototype, {
    pipe: function(root) {
        this[0] = this.root = root;
        getTrap(this.target).gets.push(this);

        // If this is the root producer listen for stream stop
        if (this.path === '') {
            this[0].done(this);
        }
    },

    listen: function(key) {
        // We may only create one child observer per key
        if (this.children[key]) { return; }
        const path     = (this.path ? this.path + '.' : '') + key;
        const producer = this.children[key] = new GetProducer(this.target[key], path);
        producer.pipe(this.root);
    },

    unlisten: function(key) {
        // Can't unobserve the unobserved
        if (!this.children[key]) { return; }
        this.children[key].stop();
        delete this.children[key];
    },

    push: function(key) {
        // Pass concatenated path and value to parent fn
        record.path  = (this.path ? this.path + '.' : '') + key;
        record.value = this.target[key];
        this.root[0].push(record);
    },

    stop: function() {
        remove(getTrap(this.target).gets, this);
        values(this.children).forEach(invokeStop);

        // If this is the root producer stop the stream
        if (this.path === '') {
            stop(this[0]);
        }

        this.status = 'stopped';
    }
});

export default function gets(observer) {
    return new Stream(new GetProducer(observer, ''));
}
