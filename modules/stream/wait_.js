
import Stream from './stream.js';

function push(source, value) {
    source.push(value);
}

export default function Wait(time) {
    let timer;
    return new Stream((source) => ({
        push: function(value) {
            clearTimeout(timer);
            timer = setTimeout(push, time * 1000, source, value);
        }
    }));
}
