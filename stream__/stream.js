
import id      from '../../../fn/modules/id.js';
import nothing from '../../../fn/modules/nothing.js';

const assign = Object.assign;
const define = Object.defineProperties;


/**
Stream()
**/

export const properties = { producer: { value: [] } };

function each(stream, fn) {
    let value;
    while ((value = stream.shift()) !== undefined) {
        fn(value);
    }
}

export default function Stream(producer) {
    properties.producer.value = producer;
    define(this, properties);
}

assign(Stream.prototype, {
    /** 
    .map()
    **/
    map: function(fn) {
        return new Transform(this, fn);
    },

    /** 
    .filter()
    **/
    filter: function(fn) {
        return new Transform(this, (value) => (fn(value) ? value : undefined));
    },

    /** 
    .reduce()
    **/
    reduce: function(fn, accumulator) {
        return new Transform(this, (value) => (accumulator = fn(accumulator, value)));
    },

    /** 
    .each()
    **/
    each: function(fn) {
        this.on(() => each(this, fn));
        each(this, fn);
        return this;
    },

    /** 
    .pipe()
    **/
    pipe: function(consumer) {
        this.each((value) => consumer.push(value));
        return consumer;
    },

    /** 
    .shift()
    **/
    shift: function() {
        return this.producer.shift();
    },

    /** 
    .stop()
    **/
    stop: function() {
        this.producer.stop && this.producer.stop();
        this.producer = nothing;
        return this;
    },

    /* 
    .on()
    */
    on: function(fn) {
        this.producer.on && this.producer.on(fn);
    },

    /* 
    .off()
    */
    off: function() {
        this.producer.off && this.producer.off();
    }
});







const transformProps = assign({ transform: { value: id } }, properties);

function Transform(producer, fn) {
    transformProps.producer.value = producer;
    transformProps.transform.value = fn;
    define(this, transformProps);
}

assign(Transform.prototype, Stream.prototype, {
    shift: function() {
        const value = this.producer.shift();
        if (value === undefined) { return; }
        const output = this.transform(value);
        return output === undefined ? this.shift() : output ;
    }
});



/**
TEMP
**/

window.Stream = Stream;