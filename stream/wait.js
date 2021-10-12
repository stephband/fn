
import Stream from './stream.js';

const push = (stream, value) => stream.push(value);

export default function Wait(time) {
    let timer;
    return new Stream((stream) => ({
        push: function(value) {
            clearTimeout(timer);
            timer = setTimeout(push, time * 1000, stream, value);
        }
    }));
}
