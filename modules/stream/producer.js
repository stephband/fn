
import Stopable from './stopable.js';
const assign = Object.assign;

/*
Producer
*/

export function stop(stream) {
    // Call done functions (in stream order - is this the best order, or would reverse order be better?)
    Stopable.prototype.stop.apply(stream);

    let n = -1;
    let output;
    while (output = stream[++n]) {
        stream[n] = undefined;
        stop(output);
    }
}

export default function Producer() {}

assign(Producer.prototype, {
    pipe: function(stream) {
        this[0] = stream;
    },

    stop: function() {
        stop(this[0]);
    }
});
