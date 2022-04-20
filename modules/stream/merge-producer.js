
import Producer from './producer.js';

const assign = Object.assign;

/*
MergeProducer
*/

export default function MergeProducer(inputs) {
    this.inputs = inputs;
}

assign(MergeProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        const inputs = this.inputs;

        this[0] = stream;

        let i = -1;
        let input;
        while (input = inputs[++i]) {
            // Input is a stream
            if (input.each) {
                input.pipe(stream);
            }

            // Input is a promise
            else if (input.then) {
                input
                .then((value) => stream.push(value));
                //.finally((value) => stop(this[0]));
            }

            // Input is an array-like
            else {
                let n = -1;
                while (++n < input.length) {
                    stream.push(input[n]);
                }
            }
        }
    }
});
