
import noop                   from '../noop.js';
import Stream, { push, stop } from './stream.js';

const assign = Object.assign;
const create = Object.create;
const keys   = Object.keys;


/*
Pipe
*/

function Pipe(stream, names, values, name, input) {
    this.stream   = stream;
    this.names    = names;
    this.values   = values;
    this.name     = name;
    this.input    = input;
}

assign(Pipe.prototype, {
    push: function(value) {
        const stream = this.stream;
        const values = this.values;
        const name   = this.name;

        values[name] = value;

        if (stream.active || (
            stream.active = keys(values).length === this.names.length
        )) {
            // Assign in order to produce non-duplicates... but is it necessary?
            // We don't really subscribe to immutable coding much...
            push(stream[0], assign({}, values));
        }
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
CombineProducer
*/

export default function CombineStream(inputs) {
    this.inputs = inputs;
    this.active = false;
}

CombineStream.prototype = assign(create(Stream.prototype), {
    push: null,

    pipe: function(output) {
        const inputs = this.inputs;
        const names  = keys(inputs);
        const values = {};
        this.count = names.length;

        // As in Stream.prototype.pipe()
        this[0] = output;
        output.done(this);

        // Listen to input streams
        let name;
        for (name in inputs) {
            const input = inputs[name];

            if (input.pipe) {
                // Input is a stream
                const pipe = new Pipe(this, names, values, name, input);
                input.pipe(pipe);
            }
            else if (input.then) {
                // Input is a promise. Do not chain .then() and .finally(),
                // they must fire in the same tick
                const pipe = new Pipe(this, names, values, name, input);
                input.then((value) => pipe.push(value));
                input.finally(() => pipe.stop());
            }
            else {
                // Input is a constant
                values[name] = input;
                --this.count;
            }
        }

        return output;
    }
});
