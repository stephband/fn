
import Stream from './stream.js';

const assign = Object.assign;
const keys = Object.keys;

export default function Combine(streams) {
    return new Stream((controller) => {
        const values = {};
        const names  = keys(streams);

        let active = false;
        function push(name, value) {
            values[name] = value;
            if (active || (active = keys(values).length === names.length)) {
                controller.push(assign({}, values));
            }
        }

        for (const name in streams) {
            const stream = streams[name];

            if (stream.each) {
                stream.each((value) => push(name, value));
                // Stop stream when controller stops
                controller.done(stream);
            }
            else if (stream.then) {
                stream.then((value) => push(name, value));
                // Todo: what do we do with errors?
            }
            else {
                console.log('Todo: combine() raw values ?');
            }
        }
    });
}
