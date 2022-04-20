
import Stream   from './stream.js';

const assign = Object.assign;
const create = Object.create;


/* Stream */

export default function Broadcast(producer, options) {
    Stream.apply(this, arguments);
    this.memory = !!(options && options.memory);
}

Broadcast.prototype = assign(create(Stream.prototype), {
    push: function(value) {
        if (value !== undefined) {
            // If this is a memory stream keep value
            if (this.memory) {
                this.value = value;
            }

            let n = -1;
            while (this[++n]) {
                this[n].push(value);
            }
        }
    },

    pipe: function(output) {
        let n = -1;
        while (this[++n]);
        this[n] = output;

        // If this is a memory stream, ie has value already
        if (this.value !== undefined) {
            output.push(this.value);
        }

        if (n === 0) {
            this.input.pipe(this);
        }
        return output;
    }
});
