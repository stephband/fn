
import nothing  from '../nothing.js';
import Producer from './producer.js';

const assign = Object.assign;


/*
PromiseProducer()
*/

export default function PromiseProducer(promise) {
    this.promise = promise;
}

assign(PromiseProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        const promise = this.promise;

        this[0] = stream;

        promise
        .then((value) => this[0].push(value))
        .finally((value) => this.stop());
    },

    stop: function() {
        Producer.prototype.stop.apply(this, arguments);

        // Make sure any remaining signals from the promise are not transmitted
        // to output.
        this[0] = nothing;
    }
});
