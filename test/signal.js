
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches,
    assertThrows as throws
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import './request-animation-frame.js';


Deno.test('Signal(() => s1.value + s2.value)', function() {
    const expected = ['1', '2', '12', '3', '32'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const s1 = Signal.of('1');
    const s2 = Signal.of('2');
    const s3 = Signal.from(() => s1.value + s2.value);

    test(s1.value);
    test(s2.value);
    test(s3.value);

    s1.value = '3';
    test(s1.value);
    test(s3.value);

    equals(i, expected.length);
});

Deno.test('Signal(() => s1 + s2), testing .valueOf()', function() {
    const expected = ['1', '2', '12', '3', '32'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const s1 = Signal.of('1');
    const s2 = Signal.of('2');
    const s3 = Signal.from(() => s1 + s2);

    test(s1 + '');
    test(s2 + '');
    test(s3 + '');

    s1.value = '3';
    test(s1 + '');
    test(s3 + '');

    equals(i, expected.length);
});

Deno.test('Signal.from() invalidation', function() {
    const expected = [2, 3, 2, 2, 4, 3];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    let n, m;
    const s1 = Signal.from(() => n = !n);
    const s2 = Signal.from(() => m = (m === 2 ? 4 : 2));
    const s3 = Signal.from(() => 3);
    const s4 = Signal.from(() => s1.value ? s2.value : s3.value);

    test(s4.value);
    s1.invalidate();
    test(s4.value);
    s1.invalidate();
    test(s4.value);

    // Shouldnt change anything, s3 was not evaluated or registered on s4
    s3.invalidate();
    test(s4.value);

    // Should change something, s2 was evaluated and registered on s4
    s2.invalidate();
    test(s4.value);

    s1.invalidate();
    test(s4.value);

    equals(i, expected.length);
});

Deno.test('Signal.of()', function() {
    const expected = [undefined, 2, 3];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    let n, m;
    const s1 = Signal.of();
    const s2 = Signal.of(2);
    const s3 = Signal.from(() => s1.value + s2.value);

    test(s1.value);
    test(s2.value);
    //test(s3.value);

    s1.value = 1;
    test(s3.value);

    equals(i, expected.length);
});

Deno.test('Signal a + b = c', function() {
    const expected = [1, 2, 'compute', 3, 'compute', 4, 4];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    let n, m;
    const a = Signal.of(1);
    const b = Signal.of(2);
    const c = Signal.from(() => {
        const v = a.value === 1 ?
            a.value + b.value :
            a.value ;

        test('compute');
        return v;
    });

    test(a.value);
    test(b.value);
    test(c.value);

    // Invalidate a, c must now be invalid
    a.value = 4;

    // evaluate c, c now has no dependency on b because b was not evaluated
    test(c.value);

    // Invalidate b. This should not cause c to invalidate, so should not test('compute').
    // (But it does :))
    b.value = 0;
    test(c.value);

    equals(i, expected.length);
});

Deno.test('Signal.tick()', async function() {
    const expected = [0, 1];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const a        = Signal.of(0);
    const renderer = Signal.tick(() => test(a.value));
    a.value = 1;
    await Promise.resolve();

    equals(i, expected.length);
});

Deno.test('Signal.frame()', async function() {
    const expected = [0, 1];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const a        = Signal.of(0);
    const renderer = Signal.frame(() => test(a.value));
    a.value = 1;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    equals(i, expected.length);
});

Deno.test('Signal.tick() graph errors', async () => {
    const expected = [1, 3, 4, 5, 6];

    let i = 0;
    const s1 = Signal.of(1);
    const s2 = Signal.of(2);
    const s3 = Signal.from(() => {
        // Error after initial evaluation
        if (i++) throw new Error('Signal 3 throws');
        return s1 + s2;
    });
    const s4 = Signal.of(4);
    const s5 = Signal.from(() => {
        // Error on initial evaluation
        throw new Error('Signal 5 throws');
    });

    Signal.tick(() => equals(s1.value, expected.shift()));
    Signal.tick(() => equals(s3.value, expected.shift()));
    Signal.tick(() => equals(s4.value, expected.shift()));
    Signal.tick(() => equals(s5.value, expected.shift()));

    // Schedule invalidations
    s1.value = 5;
    s4.value = 6;

    // Wait for ticks to render
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Check bad signal propagate error throws
    throws(() => s3.value);
    throws(() => s5.value);

    equals(0, expected.length);
});

Deno.test('Signal.frame() graph errors', async () => {
    const expected = [1, 3, 4, 5, 6];

    let i = 0;
    const s1 = Signal.of(1);
    const s2 = Signal.of(2);
    const s3 = Signal.from(() => {
        // Error after initial evaluation
        if (i++) throw new Error('Signal 3 throws');
        return s1 + s2;
    });
    const s4 = Signal.of(4);
    const s5 = Signal.from(() => {
        // Error on initial evaluation
        throw new Error('Signal 5 throws');
    });

    Signal.frame(() => equals(s1.value, expected.shift()));
    Signal.frame(() => equals(s3.value, expected.shift()));
    Signal.frame(() => equals(s4.value, expected.shift()));
    Signal.frame(() => equals(s5.value, expected.shift()));

    // Schedule invalidations
    s1.value = 5;
    s4.value = 6;

    // Wait for ticks to render
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Check bad signal propagate error throws
    throws(() => s3.value);
    throws(() => s5.value);

    equals(0, expected.length);
});
