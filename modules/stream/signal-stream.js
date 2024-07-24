
import Signal, { hasInput } from '../signal.js';
import Stream, { pipe }     from './stream.js';

const assign = Object.assign;
const create = Object.create;
const S      = Stream.prototype;

function evaluate() {
    return this.signal.value;
}

export default function SignalStream(signal, initial) {
    this.signal  = signal;
    this.initial = initial;
}

SignalStream.prototype = assign(create(Stream.prototype), {
    push: null,

    invalidate: function(signal) {
        if (this.status === 'done') return;

        // Verify that signal has the right to invalidate this
        if (signal && !hasInput(this, signal)) return;

        // Clear inputs
        let n = 0;
        while (this[--n]) this[n] = undefined;

        // Evaluate and send value to consumer on next tick
        promise.then(() =>  S.push.apply(this, Signal.evaluate(this, evaluate)));
    },

    pipe: function(output) {
        // Set up dependency graph, return value
        const value = Signal.evaluate(this, evaluate);
        pipe(this, output);

        // Run the observer if value is not initial
        if (value !== initial) S.push.apply(this, value);

        return output;
    }
});
