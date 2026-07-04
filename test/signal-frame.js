
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal, { FrameSignal } from '../modules/signal.js';
import './request-animation-frame.js';


// Deno has no audio clock; context.currentTime (in seconds) becomes
// performance.now() in seconds.
const now  = () => performance.now() / 1000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


Deno.test('Nested Signal.frame() does not persist after outer signal closed', async function() {
    const expected = [
        'outer', 0,
        'inner', 0,
        'inner', 1,
        'outer', 1,
        'inner', 1,
        'inner', 2
    ];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const a = Signal.of(0);
    const b = Signal.of(0);

    Signal.frame(() => {
        test('outer');
        test(a.value);
        Signal.frame(() => {
            test('inner');
            test(b.value);
        });
    });

    // Should only trigger render of inner frame
    b.value = 1;
    await wait(100);

    // Should rerender both
    a.value = 1;
    await wait(100);

    // There should only be one inner at this point, the old one should have
    // been stopped and the new one will log 'inner', 2.
    b.value = 2;
    await wait(100);

    equals(i, expected.length);
});

Deno.test('FrameSignal(() => false) adds observer to queue', function() {
    const expected = [true];
    let i = 0;
    const expect = (value, message) => equals(value, expected[i++], message);

    const stopTime = now() + 0.1;
    const observer = Signal.frame(() => now() < stopTime);

    // Verify observer is in the static observers array
    expect(FrameSignal.observers.includes(observer), "Observer should be in the queue");

    // Clean up after test
    observer.stop();

    equals(i, expected.length);
});

Deno.test('FrameSignal stops at validTime', async function() {
    const expected = [true];
    let i = 0;
    const expect = (value, message) => equals(value, expected[i++], message);

    const startTime = now();
    let lastTime = 0;
    let updateCount = 0;

    // Schedule to run for only 0.5 seconds
    const validTime = startTime + 0.5;

    const observer = Signal.frame(() => {
        lastTime = now();
        updateCount++;
        return now() < validTime;
    });

    // Check after observer should be done
    await wait(600);
    const finalCount = updateCount;

    // Wait a bit more to verify no more updates
    await wait(300);

    // If observer stopped correctly, updateCount shouldn't change
    expect(updateCount === finalCount, "Observer should have stopped updating at validTime");

    // Clean up
    observer.stop();

    equals(i, expected.length);
});

Deno.test('FrameSignal updates when dependencies change', async function() {
    const expected = [3, 0, 1, 4, 0];
    let i = 0;
    const expect = (value) => equals(value, expected[i++]);

    const signal   = Signal.of(3);
    const observer  = Signal.frame(() => {
        const value = signal.value;
        // 0 - should be 3
        // 3 - Should be 4
        expect(value);
    });

    await wait(100);
    // 1 - Should be 0
    expect(FrameSignal.observers.length);

    signal.value = 2;
    signal.value = 4;
    // 2 - Should be 1
    expect(FrameSignal.observers.length);

    await wait(100);
    // 4 - Should be 0
    expect(FrameSignal.observers.length);

    equals(i, expected.length);
});
