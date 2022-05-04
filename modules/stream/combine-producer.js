
import Producer from './producer.js';

const assign = Object.assign;
const keys   = Object.keys;

/*
CombineProducer
*/

function push(producer, name, value) {
    const values = producer.values;
    const names  = producer.names;
    const stream = producer[0];

    values[name] = value;

    if (producer.active || (producer.active = keys(values).length === names.length)) {
        stream.push(assign({}, values));
    }
}

export default function CombineProducer(inputs) {
    this.inputs = inputs;
}

assign(CombineProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        const inputs = this.inputs;

        this.values = {};
        this.names  = keys(inputs);
        this.active = false;
        this[0]     = stream;

        for (const name in inputs) {
            const input = inputs[name];

            if (input.pipe) {
                stream.done(input.each((value) => push(this, name, value)));
            }
            else if (input.then) {
                input.then((value) => push(this, name, value));
                //.finally((value) => stop(this[0]));
            }
            else {
                console.log('Todo: combine() raw values ?');
            }
        }
    }
});
