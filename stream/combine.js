
import Stream from './stream.js';

const assign = Object.assign;

export function Combine(streams) {
    return new Stream((controller) => {
        const values = {};
        let i = -1, stream;
        while (stream = streams[++i]) {
            const n = i;
            if (stream.each) {
                stream.each((value) => {
                    values[n] = value;
                    controller.push(assign({}, values));
                });
            }
            else if (stream.then) {
                stream.then((value) => {
                    values[n] = value;
                    controller.push(assign({}, values));
                });
                // Todo: what do we do with errors?
            }
            else {
                console.log('Todo: combine() raw values ?');
            }
        }
    });
}

export default function combine() {
    return Combine(arguments);
}
