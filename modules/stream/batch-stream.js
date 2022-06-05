
import noop   from '../noop.js';
import Stream from './stream.js';

const assign  = Object.assign;
const promise = Promise.resolve();

const tickTimer = {
    schedule: function() {
        promise.then(this.fire);
    },

    unschedule: noop
};

const frameTimer = {
    schedule: function() {
        this.timer = requestAnimationFrame(this.fire);
    },

    unschedule: function() {
        cancelAnimationFrame(this.timer);
        this.timer = undefined;
    }
};

const timeTimer = {
    schedule: function() {
        this.timer = setTimeout(this.fire, this.duration * 1000);
    },

    unschedule: function() {
        clearTimeout(this.timer);
        this.timer = undefined;
    }
};

export default function BatchStream(producer, duration) {
    Stream.apply(this, arguments);

    this.duration = duration;
    this.timer = undefined;

    this.fire = () => {
        this.timer = undefined;
        this.output.stop();
    };

    assign(this,
        duration === 'tick' ? tickTimer :
        duration === 'frame' ? frameTimer :
        timeTimer
    );
}

assign(BatchStream.prototype, Stream.prototype, {
    push: function(value) {
        if (this.timer) {
            this.unschedule();
            this.schedule();
            this.output.push(value);
        }
        else {
            this.output = Stream.of(value);
            this[0].push(this.output);
            this.schedule();
        }
    },

    stop: function() {
        if (this.timer) {
            this.fire();
        }

        Stream.prototype.stop.apply(this, arguments);
    }
});
