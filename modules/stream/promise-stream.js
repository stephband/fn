
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
PromiseStream()
*/

export default function PromiseStream(promise) {
    this.promise = promise;
}

PromiseStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        const promise = this.promise;

        this[0] = output;
        output.done(this);

        // Do not chain .then() and .finally(), they must fire in the same tick
        promise.then((value) => push(this, value));
        promise.finally(() => stop(this));
        return output;
    }
});
