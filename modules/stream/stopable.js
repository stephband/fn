
import id       from '../id.js';
import overload from '../overload.js';
import toType   from '../to-type.js';


const define = Object.defineProperties;
const call = overload(toType, {
    function: (fn) => fn(),
    object:   (object) => object.stop()
});


/** Stopable() **/

export default class Stopable extends id {
    #stopables;

    /**
    .stop()
    Stops the stream, passing any parameters up to the head of the stream. The
    head determines whether the stream stops immediately or asynchronously.
    **/
    stop() {
        // Check we are not already done
        if (this.status === 'done') return this;

        // Set status
        this.status = 'done';

        // Call done functions and stopables
        const stopables = this.#stopables;
        this.#stopables = undefined;
        if (stopables) stopables.forEach(call);

        // Make it chain-able
        return this;
    }

    /**
    .done(fn)
    Cues `fn` to be called when the stream is stopped. If `fn` is an object, it
    must have a `.stop()` method, which is called when this is stopped.
    **/
    done(fn) {
        // Is stream already stopped? Call listener immediately.
        if (this.status === 'done') {
            call(listener);
            return this;
        }

        // Add to done handlers
        const stopables = this.#stopables || (this.#stopables = []);
        stopables.push(fn);

        // Make it chain-able
        return this;
    }
}

define(Stopable.prototype, {
    status: { writable: true }
});
