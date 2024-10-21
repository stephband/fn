
import Signal, { hasInput } from '../signal.js';
import Stream from './stream.js';

const assign  = Object.assign;
const create  = Object.create;
const promise = Promise.resolve();

export default function SignalStream(evaluate, context) {
    this.fn = () => {
        this.status = undefined;
        Stream.push(this, Signal.evaluate(this, evaluate, context));
    };
}

SignalStream.prototype = assign(create(Stream.prototype), {
    invalidate: function(input) {
        // If the observer is already cued do nothing
        if (this.status === 'cued') return;

        // Verify that input signal has the right to invalidate this
        if (input && !hasInput(this, input)) return;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Evaluate and send value to consumer on next tick
        this.status = 'cued';
        promise.then(this.fn);
    },

    start: function() {
        // Evaluate and send value to consumer
        this.fn();
        return this;
    },

    stop: function() {
        // Remove this from signal graph, loop through inputs
        let n = 0, input;
        while (input = this[--n]) {
            let m = -1;
            removeOutput(input, this);
            this[n] = undefined;
        }

        // Stop .done() listeners and downstream pipes
        return Stream.stop(this);
    }
});

Stream.signal = function(fn, context) {
    return new SignalStream(fn, context);
};
