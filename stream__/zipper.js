
import Stream, { properties } from './stream.js';

const assign = Object.assign;
const define = Object.defineProperties;

/** 
Zipper

Zips multiple producers into a stream of objects carrying the equal-indexed
values from all producers.
**/

function start(observable, consumer) {
    const producers = observable.producer;
    const values    = {};

    producers.forEach((producer, i) =>
        producer.each((value) => {
            console.log('TODO ZIP producers!');
        })
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

export default function Zipper(producers) {
    // Define `producers` as unenumerable property
    properties.producer.value = producers;
    define(this, properties);
}

assign(Zipper.prototype,  Stream.prototype, {
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
