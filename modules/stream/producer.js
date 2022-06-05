
import stop     from './stream.js';
const assign = Object.assign;

/*
Producer
*/

export default function Producer() {}

assign(Producer.prototype, {
    pipe: function(stream) {
        this[0] = stream;
        return stream;
    },

    stop: function() {
        // Producer may not yet have been .pipe()ed
        if (this[0]) {
            stop(this[0]);
        }

        return this;
    }
});
