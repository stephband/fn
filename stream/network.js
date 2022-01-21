
import { equals } from '../modules/equals.js';
import Stream     from './stream.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
Network()
**/

const types = {
    input:  (stream, data, nodes, inputs) => new Stream((source) => inputs.push(source)),
    map:    (stream, data) => stream.map(data),
    filter: (stream, data) => stream.filter(data),

    dedup:  (stream, data) => {
        let previous;
        return stream.map((value) => (
            equals(previous, value) ?
                undefined :
                (previous = value)
        ));
    },

    log:    (stream, data) => stream.each((value) => console.log(data, value))
};

function createId(ids) {
    let n = 0;
    while (++n) {
        if (ids.indexOf(n) === -1) {
            return n;
        }
    }
}

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
    // Hide inputs from JSON
    define(this, {
        constructors: { value: assign({}, types, fns) },
        inputs:       { value: [] }
    });

    this.nodes  = [];
    this.routes = routes;

    var n = -1, node;
    while(node = nodes[++n]) {
        const source = findSource(this.nodes, this.routes, node.id);
        const stream = this.constructors[node.type](source, node.data, nodes, this.inputs);

        this.nodes.push(define(node, {
            stream: { value: stream }
        }));
    }
}

assign(Network.prototype, {
    push: function() {
        console.log('network.push() (not implemented)');
    },

    findSource: function(id) {
        const i = findRouteIndexByTargetId(id, this.routes);
        return this.routes[i];
    },

    findTarget: function(id) {
        const i = findRouteIndexBySourceId(id, this.routes);
        return this.routes[i + 1];
    },

    /**
    .create(type, data, node)
    Creates a new process of `type`. Where the process is not an input,
    requires a source `node` (non-input processes are streams created from
    existing processes).
    **/

    create: function(type, data, process) {
        const stream = process && process.stream;
        const node = define({
            id:   createId(this.nodes.map((node) => node.id)),
            type: type,
            data: data
        }, {
            stream: {
                value: this.constructors[type](stream, data, this.nodes, this.inputs)
            }
        });

        // Update nodes and routes arrays
        if (process) {
            if (process.type === 'distribute') {
                this.nodes.push(node);
                this.routes.push(process.id, node.id);
            }

            else {
                const i = findRouteIndexBySourceId(process.id, this.routes);

                // No existing target
                if (i === undefined) {
                    this.nodes.push(node);
                    this.routes.push(process.id, node.id);
                }

                // There is an existing target
                else {
                    const targetId   = this.routes[i + 1];
                    const targetNode = this.nodes.find((node) => node.id === targetId);

                    // Splice node into the stream and update nodes and routes
                    node.stream.target = targetNode.stream;
                    this.nodes.splice(this.nodes.indexOf(process) + 1, 0, node);
                    this.routes[i + 1] = node.id;
                    this.routes.splice(i + 2, 0, node.id, targetId);
                }
            }
        }
        else {
            this.nodes.push(node);
        }

        return node;
    }
});
