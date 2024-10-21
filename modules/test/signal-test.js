
import run    from '../test.js';
import Signal from '../signal.js';

run('Signal(() => s1.value + s2.value)', ['1', '2', '12', '3', '32'], (test, done) => {
    const s1 = Signal.of('1');
    const s2 = Signal.of('2');
    const s3 = Signal.from(() => s1.value + s2.value);

    test(s1.value);
    test(s2.value);
    test(s3.value);

    s1.value = '3';
    test(s1.value);
    test(s3.value);

    done();
});

run('Signal(() => s1 + s2), testing .valueOf()', ['1', '2', '12', '3', '32'], (test, done) => {
    const s1 = Signal.of('1');
    const s2 = Signal.of('2');
    const s3 = Signal.from(() => s1 + s2);

    test(s1 + '');
    test(s2 + '');
    test(s3 + '');

    s1.value = '3';
    test(s1 + '');
    test(s3 + '');

    done();
});

run('Signal.from() invalidation', [2, 3, 2, 2, 4, 3], (test, done) => {
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

    done();
});

run('Signal.of()', [undefined, 2, 3], (test, done) => {
    let n, m;
    const s1 = Signal.of();
    const s2 = Signal.of(2);
    const s3 = Signal.from(() => s1.value + s2.value);

    test(s1.value);
    test(s2.value);
    //test(s3.value);

    s1.value = 1;
    test(s3.value);


    done();
});

run('Signal a + b = c', [1, 2, 'compute', 3, 'compute', 4, 4], (test, done) => {
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

    done();
});

run('Signal.tick()', [0, 1], (test, done) => {
    const a        = Signal.of(0);
    const renderer = Signal.tick(() => test(a.value));
    a.value = 1;
    Promise.resolve().then(done);
});

run('Signal.frame()', [0, 1], (test, done) => {
    const a        = Signal.of(0);
    const renderer = Signal.frame(() => test(a.value));
    a.value = 1;
    requestAnimationFrame(done);
});
