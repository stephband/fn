
import run    from '../test.js';
import Signal from '../signal.js';


run('Signal(() => s1.value + s2.value)',
['1', '2', '12', '3', '32'],
function(test, done) {
    const s1 = new Signal(() => '1');
    const s2 = new Signal(() => '2');
    const s3 = new Signal(() => s1.value + s2.value);

    test(s1.value);
    test(s2.value);
    test(s3.value);

    s1.value = '3';
    test(s1.value);
    test(s3.value);

    done();
});

run('Signal(() => s1 + s2), testing .valueOf()',
['1', '2', '12', '3', '32'],
function(test, done) {
    const s1 = Signal.from(() => '1');
    const s2 = Signal.from(() => '2');
    const s3 = Signal.from(() => s1 + s2);

    test(s1 + '');
    test(s2 + '');
    test(s3 + '');

    s1.value = '3';
    test(s1 + '');
    test(s3 + '');

    done();
});

run('Signal.from() invalidation',
[2, 3, 2, 2, 4, 3],
function(test, done) {
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

run('Signal.of()',
[undefined, 2,/* NaN,*/ 3],
function(test, done) {
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
