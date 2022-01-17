
import id        from '../modules/id.js';
import { clamp } from '../modules/clamp.js';
import { setPath as set }   from '../modules/set-path.js';
import { Observer } from '../observer/observer.js';

import Distributor  from './distributor.js';
import Network      from './network.js';

const TIME  = 0;
const VALUE = 1;
const TYPE  = 2;

const assign = Object.assign;

const fypes = {
    in:      (data, value) => (data.includes(value)),
    is:      (data, value) => (data.value === value),
    minmax:  (data, value) => (data.min <= value && value < data.max)
};

function fatch(filter, value) {
    return fypes[filter.type](filter.data, value);
}


const mypes = {
    normalise: (data, value) => normalise(data.min, data.max, value),
    clamp:     (data, value) => clamp(data.min, data.max, value),
    add:       (data, value) => data.value + value,
    multiply:  (data, value) => data.value * value,
};

function map(map, value) {
    return mypes[map.type](map.data, value);
}


function Event() {
    return Float32Array.from(arguments);
}


const TYPES = ['linear'];

const types = {
    input: (stream, data, nodes, inputs) =>
        new Stream((source) => inputs.push(source)),

    ui: (stream, data, nodes, inputs) =>
        new Stream((source) => ({ push: (v) => source.push(v) })),

    distribute: (source, data) =>
        source.pipe(new Distributor(data)),

    filter: (source, data) =>
        source.filter((event) => (
            // Time
            (!data.time || fatch(data.time, event[TIME]))
            // Type
            && (!data.type || fatch(data.type, TYPES[event[TYPE]]))
            // Value
            && (!data.value || fatch(data.value, event[VALUE]))
        )),

    map: (source, data) =>
        source.map((event) => {
            // Time
            const time = data.time ?
                map(data.time, event[TIME]) :
                event[TIME] ;

            // Type
            const type = data.type ?
                map(data.type, TYPES[event[TYPE]]) :
                event[TYPE] ;

            // Value
            const value = data.value ?
                map(data.value, event[VALUE]) :
                event[VALUE] ;

            return Event(time, value, type);
        }),

    route: (source, data) =>
        source.each((value) => console.log('route', data.id, data.name, value)),

    set: (source, data, nodes) => {
        // data.target is id of node
        const target = nodes.find((node) => node.id === data.target);
        if (!target) { new Error('Target ' + data.target + ' not found'); }
        return source.each((event) =>
            set(data.name, Observer(target.data), event[VALUE])
        );
    },

    log: (source, data) =>
        source.each((event) => console.log('Event', event[TIME], event[VALUE], TYPES[event[TYPE]])),

    print: (source, data) => source
};

/**
ControlNetwork()
**/

export default function ControlNetwork(nodes, routes) {
    return new Network(nodes, routes, types);
}

assign(ControlNetwork.prototype, {

});
