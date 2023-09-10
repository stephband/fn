
import Stream, { pipe } from './stream.js';

const assign = Object.assign;
const create = Object.create;


/*
FunctionStream(fn)
A FunctionStream is a readable stream of values produced by `fn(push, stop)`,
which is called when the stream is first consumed.
*/

export default function FunctionStream(fn) {
    this.fn = fn;
}

FunctionStream.prototype = assign(create(Stream.prototype), {
    pipe: function(output) {
        // Connect stream to output
        pipe(this, output);

        // Call fn(push, stop)
        this.fn((value) => this.push(value), (value) => this.stop(value));

        // Return output stream
        return output;
    }
});
