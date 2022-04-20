
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

export default function CombineProducer(sources) {
    this.sources = sources;
}

assign(CombineProducer.prototype, Producer.prototype, {
    pipe: function(stream) {
        const sources = this.sources;

        this.values = {};
        this.names  = keys(sources);
        this.active = false;
        this[0]     = stream;

        for (const name in sources) {
            const source = sources[name];

            if (source.each) {
                stream.done(source.each((value) => push(this, name, value)));
            }
            else if (source.then) {
                source.then((value) => push(this, name, value));
                //.finally((value) => stop(this[0]));
            }
            else {
                console.log('Todo: combine() raw values ?');
            }
        }
    }
});
