
import ObserveSignal from '../signal.js';
import Stream from './stream.js';

const assign  = Object.assign;
const create  = Object.create;

/* SignalStream */

function SignalStream(evaluate, context) {
    this.evaluate = evaluate;
    this.context  = context;
    this.fn = () => {
        this.promise = undefined;
        Stream.push(this, Signal.evaluate(this, evaluate, context)));
    };
}

SignalStream.prototype = assign(create(Stream.prototype), ObserveSignal.prototype, {
    start: function() {
        // Evaluate and send value to consumer
        this.fn();
        return this;
    },

    stop: function() {
        // Remove this from signal graph
        ObserveSignal.prototype.stop.apply(this);
        // Stop .done() listeners and downstream pipes
        return Stream.stop(this);
    }
});

Stream.signal = function(fn, context) {
    return new SignalStream(fn, context);
};
