
import Stream, { properties } from './stream.js';

const assign = Object.assign;
const define = Object.defineProperties;

/** 
Merger()

Merges multiple producers into a single stream of values.
**/

function start(observable, consumer) {
    observable.producer.forEach((producer) =>
        producer.each(consumer)
    );
}

function stop(observable) {
    observable.producer.forEach((producer) => 
        // TODO: this isnt strictly what we want, we simply want to unsubscribe
        // here rather than stopping the producers altogether ... or am I 
        // talking balls? Maybe we do want them to stop? I mean, how often do 
        // you reuse a producer? Thats right, never. Would you, if you could?
        // Unlikely. It's balls.
        producer.stop && producer.stop()
    );
}

export default function Merger(producers) {
    // Define `producers` as unenumerable property
    properties.producer.value = producers;
    define(this, properties);
}

assign(Merger.prototype, Stream.prototype, {
    each: function(consumer) {
        start(this, consumer);
        return this;
    },

    pipe: function(consumer) {
        start(this, consumer);
        return consumer;
    },

    stop: function() {
        stop(this);
        return this;
    }
});
