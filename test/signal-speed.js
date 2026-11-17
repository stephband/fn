import { assertEquals as equals } from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';
import './request-animation-frame.js';


function makeEvents(count) {
    return Array.from({ length: count }, (_, i) => [
        i * 0.5,
        'note',
        60 + (i % 12),
        0.1,
        0.5
    ]);
}

function sumEvents(events) {
    let sum = 0;
    let i = -1;
    let event;
    while (event = events[++i]) {
        sum += event[0] + event[2] + event[4];
    }
    return sum;
}


Deno.test('Signal + Data.of() scaling across N events (highlights O(N^2) setDependency)', () => {
    const sizes  = [50, 200, 500, 1000];
    const rows   = [];

    for (const N of sizes) {
        const raw = { events: makeEvents(N) };

        // Baseline: unproxied read
        const tRaw0 = performance.now();
        const expected = sumEvents(raw.events);
        const rawMs = performance.now() - tRaw0;

        // First evaluation of Signal.from reading Data.of(raw)
        const proxy = Data.of(raw);
        const tFirst0 = performance.now();
        const sig = Signal.from(() => sumEvents(proxy.events));
        const val1 = sig.value;
        const firstMs = performance.now() - tFirst0;
        equals(val1, expected);

        // Mutate one event and re-evaluate
        const tMut0 = performance.now();
        proxy.events[0][2] += 1;
        const val2 = sig.value;
        const updateMs = performance.now() - tMut0;
        equals(val2, expected + 1);

        rows.push({
            events:   N,
            reads:    N * 4,
            rawMs:    rawMs.toFixed(3),
            firstMs:  firstMs.toFixed(3),
            updateMs: updateMs.toFixed(3),
            ratio:    (firstMs / Math.max(rawMs, 0.001)).toFixed(0) + 'x'
        });
    }

    console.table(rows);
});
