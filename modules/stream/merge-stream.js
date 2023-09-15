
import Stream, { pipe, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
Source()
*/

function Source(stream) {
    this.stream = stream;
}

assign(Source.prototype, {
    push: function(value) {
        this.stream[0].push(value);
    },

    stop: function() {
        // Stop stream when all inputs are stopped
        if (--this.stream.count === 0) {
            stop(this.stream);
        }
    },

    done: function(stopable) {
        console.log('HELLO');
        this.stream.done(stopable);
    }
});


/*
MergeStream
*/

export default function MergeStream(inputs) {
    this.inputs = inputs;
}

MergeStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        const inputs = this.inputs;
        this.count = inputs.length;

        // As in Stream.prototype.pipe()
        pipe(this, output);

        // Listen to inputs
        const source = new Source(this);

        let i = -1;
        let input;
        while (input = inputs[++i]) {
            if (input.pipe) {
                // Input is a stream
                input.pipe(source);
            }
            else if (input.then) {
                // Input is a promise. Do not chain .then() and .finally(),
                // they must fire in the same tick
                input.then((value) => source.push(value));
                input.finally(() => source.stop());
            }
            else {
                // Input is an array-like
                let n = -1;
                while (++n < input.length) {
                    source.push(input[n]);
                }
                source.stop();
            }
        }

        return output;
    }
});
