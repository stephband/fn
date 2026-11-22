
import {
    assertEquals as equals,
    assertStrictEquals as is
} from 'jsr:@std/assert@1';

import Stream, { ColdStream, Consumer } from '../modules/stream.js';


class HotBus extends Stream {
    started = 0;

    // Domain-specific start() must NOT be auto-invoked by Stream.prototype.pipe()
    start(arg) {
        this.started++;
        return arg;
    }

    push(value) {
        return Stream.push(this, value);
    }
}


Deno.test('Hierarchy: Stopable > Consumer > Stream > ColdStream', () => {
    const hot  = new Stream();
    const cold = new ColdStream();

    is(hot instanceof Consumer, true);
    is(hot instanceof Stream, true);
    is(hot instanceof ColdStream, false);
    is(hot.start, undefined);

    is(cold instanceof Consumer, true);
    is(cold instanceof Stream, true);
    is(cold instanceof ColdStream, true);
    is(typeof cold.start, 'function');
    is(Stream.isStream(hot), true);
    is(Stream.isStream(cold), true);
});

Deno.test('Hot Stream does not auto-call start() on pipe() and survives consumer stop()', () => {
    const bus = new HotBus();
    const seen = [];

    const sub = bus.each((v) => seen.push(v));
    is(bus.started, 0);

    bus.push(1);
    bus.push(2);
    equals(seen, [1, 2]);

    // Stopping consumer detaches from hot Stream without stopping it
    sub.stop();
    is(bus.status, undefined);

    // Subsequent consumers still work on the hot Stream
    const seen2 = [];
    bus.each((v) => seen2.push(v));
    bus.push(3);
    equals(seen, [1, 2]);
    equals(seen2, [3]);
});

Deno.test('Hot Stream survives upstream hot Stream stop() and unpipe()', () => {
    const frames = new HotBus();
    const seq    = new HotBus();
    const dist   = new HotBus();
    const seen   = [];

    frames.pipe(seq).pipe(dist);
    dist.each((v) => seen.push(v));

    frames.push(10);
    equals(seen, [10]);

    // Stopping seq detaches it without killing frames (upstream) or dist (downstream)
    seq.stop();
    is(seq.status, 'done');
    is(frames.status, undefined);
    is(dist.status, undefined);

    // A new sequencer can pipe into the still-alive frames and dist
    const seq2 = new HotBus();
    frames.pipe(seq2).pipe(dist);
    frames.push(20);
    equals(seen, [10, 20]);

    // unpipe() detaches without stopping either stream
    frames.unpipe(seq2);
    frames.push(30);
    is(seq2.status, undefined);
    equals(seen, [10, 20]);
});

Deno.test('Hot Stream piped into cold operators (.map().each()) activates lazily and survives teardown', () => {
    const bus = new HotBus();
    let mapped = 0;
    const seen = [];

    const m = bus.map((x) => {
        mapped++;
        return x * 10;
    });

    // Cold Map has not attached to hot bus yet
    bus.push(1);
    is(mapped, 0);

    // Attaching .each() starts Map -> wires into bus WITHOUT calling bus.start()
    const sub = m.each((v) => seen.push(v));
    is(bus.started, 0);

    bus.push(2);
    bus.push(3);
    equals(seen, [20, 30]);
    is(mapped, 2);

    // Stopping consumer tears down Map but keeps hot bus alive
    sub.stop();
    is(m.status, 'done');
    is(bus.status, undefined);

    bus.push(4);
    is(mapped, 2);
});

Deno.test('Stream.cold(start) is lazy, calls cleanup on stop, and auto-stops on consumer detach', () => {
    let starts  = 0;
    let cleaned = 0;
    let emit;
    const seen = [];

    const cold = Stream.cold((push) => {
        starts++;
        emit = push;
        push('init');
        return () => { cleaned++; };
    });

    // Cold: not started until consumed
    is(starts, 0);

    const mapped = cold.map((v) => v + '!');
    is(starts, 0);

    const sub = mapped.each((v) => seen.push(v));
    is(starts, 1);
    equals(seen, ['init!']);

    emit('next');
    equals(seen, ['init!', 'next!']);

    // Stopping consumer auto-stops mapped -> auto-stops cold -> runs cleanup
    sub.stop();
    is(mapped.status, 'done');
    is(cold.status, 'done');
    is(cleaned, 1);
});

Deno.test('Stream.push() preserves order and does not skip siblings when an output stops mid-push', () => {
    const frames = new HotBus();
    const order  = [];

    const a = new HotBus();
    a.push = (v) => {
        order.push('a:' + v);
        if (v === 2) a.stop();
    };

    const b = new HotBus();
    b.push = (v) => {
        order.push('b:' + v);
    };

    frames.pipe(a);
    frames.pipe(b);

    frames.push(1);
    frames.push(2);
    frames.push(3);

    equals(order, ['a:1', 'b:1', 'a:2', 'b:2', 'b:3']);
});
