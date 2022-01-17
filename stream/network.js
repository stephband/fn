
import Stream from './stream.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
Network()
**/

const types = {
    input:   (stream, data, nodes, inputs) => new Stream((source) => inputs.push(source)),
    map:     (stream, data) => stream.map(data),
    filter:  (stream, data) => stream.filter(data),
    log:     (stream, data) => stream.each((value) => console.log(data, value))
};

function findRouteIndexBySourceId(id, routes) {
    let n = -2;
    while(routes[n += 2] !== undefined) {
        if (routes[n] === id) {
            return n;
        }
    }
}

function findRouteIndexByTargetId(id, routes) {
    let n = -1;
    while(routes[n += 2] !== undefined) {
        if (routes[n] === id) {
            return n - 1;
        }
    }
}

function findSource(nodes, routes, targetId) {
    const index = findRouteIndexByTargetId(targetId, routes);
    if (index === undefined) { return; }

    const sourceId   = routes[index];
    const sourceNode = nodes.find((node) => node.id === sourceId);

    return sourceNode.stream;
}

export default function Network(nodes = [], routes = [], fns) {
    const constructors = assign({}, types, fns);

    // Hide from JSON
    define(this, { inputs: { value: [] }});

    this.nodes  = [];
    this.routes = routes;

    var n = -1, node;
    while(node = nodes[++n]) {
        const source = findSource(this.nodes, this.routes, node.id);
        const stream = constructors[node.type](source, node.data, nodes, this.inputs);

        this.nodes.push(define(node, {
            stream: { value: stream }
        }));
    }
}

assign(Network.prototype, {
    push: function() {
        console.log('network.push() (not implemented)');
    }
});
