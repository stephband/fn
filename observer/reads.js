
import Stream from '../stream/stream.js';
import { remove, getTarget, $observer } from './observer.js';

//const DEBUG = window.DEBUG === true;

const assign = Object.assign;
const values = Object.values;

/** 
reads(object)
Calls `fn` for every property of `object` read via a get operation. Returns an
object with the method `.stop()`.
**/

function stop(gets) {
    gets.stop();
}

function Gets(target, path, root) {
    this.children = {};

    // For some reason child proxies are being set... dunno how...
    this.target = getTarget(target);
    this.path   = path;
    this.root   = root;

    target[$observer].gets.push(this);
}

assign(Gets.prototype, {
    listen: function(key) {
        // We may only create one child observer per key
        if (this.children[key]) { return; }
        const path = this.path ? this.path + '.' : '';
        this.children[key] = new Gets(this.target[key], path + key, this.root);
    },

    unlisten: function(key) {
        // Can't unobserve the unobserved
        if (!this.children[key]) { return; }
        this.children[key].stop();
        delete this.children[key];
    },

    // Named fn because that is what is called by Observer's ObjectTrap
    fn: function(key) {
        const path = this.path ? this.path + '.' : '';
        // Pass concatenated path to parent fn
        this.root.push(path + key);
    },

    stop: function() {
        remove(this.target[$observer].gets, this);
        values(this.children).forEach(stop);
    }
});

export default function reads(observer) {
    return new Stream((controller) => {
        controller.done(new Gets(getTarget(observer), '', controller))
        return;
    });
}
