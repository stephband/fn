
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
Pipe
*/

function Pipe(stream) {
    this.stream = stream;
}

assign(Pipe.prototype, {
    push: function(value) {
        push(this.stream[0], value);
    },

    stop: function() {
        // Stop stream when all inputs are stopped
        if (--this.stream.count === 0) {
            stop(this.stream);
        }
    },

    done: function(stopable) {
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
        this[0] = output;
        output.done(this);

        // Listen to inputs
        const pipe = new Pipe(this);

        let i = -1;
        let input;
        while (input = inputs[++i]) {
            if (input.pipe) {
                // Input is a stream
                input.pipe(pipe);
            }
            else if (input.then) {
                // Input is a promise. Do not chain .then() and .finally(),
                // they must fire in the same tick
                input.then((value) => pipe.push(value));
                input.finally(() => pipe.stop());
            }
            else {
                // Input is an array-like
                let n = -1;
                while (++n < input.length) {
                    pipe.push(input[n]);
                }
                pipe.stop();
            }
        }

        return output;
    }
});
