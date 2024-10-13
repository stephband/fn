
import Stream, { pipe, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;


/**
PromiseStream(promise)
**/

export default function PromiseStream(promise) {
    this.promise = promise;
}

PromiseStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        const promise = this.promise;

        pipe(this, output);

        // Do not chain .then() and .finally(), fire them in the same tick
        promise.then((value) => {
            if (this.status === 'done') { return; }
            this[0].push(value);
        });

        promise.finally(() => stop(this));

        return output;
    }
});
