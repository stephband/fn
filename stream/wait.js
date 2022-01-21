
import Stream from './stream.js';

function push(source, p, value) {
    p.call(source, value);
}

export default function Wait(time) {
    let timer;
    return new Stream((source) => {
        const p = source.push;
        // The way to make a stream pushable is to override push on source
        source.push = function(value) {
            clearTimeout(timer);
            timer = setTimeout(push, time * 1000, source, p, value);
        };
    });
}
