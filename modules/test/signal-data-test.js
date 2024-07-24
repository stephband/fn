
import run    from '../test.js';
import Signal from '../signal.js';
import Data   from '../data.js';


run('Data.signal()',
[1, 2, 2],
function(test, done) {
    const object = { a: 1, b: 2 };
    const data   = Data(object);
    const s1     = Data.signal('a', object);

    test(s1.value);

    // This triggers an invalidation
    data.a = 2;
    test(s1.value);

    // This does not
    object.a = 3;
    test(s1.value);

    done();
});

run('Signal.from(() => data.a)',
[1, 2, 2],
function(test, done) {
    const object = { a: 1, b: 2 };
    const data   = Data(object);
    const s1     = Signal.from(() => data.a);

    test(s1.value);

    // This triggers an invalidation
    data.a = 2;
    test(s1.value);

    // This does not
    object.a = 3;
    test(s1.value);

    done();
});

run('Signal.from(() => data1.a + data2.a)',
[3, 5, 9],
function(test, done) {
    const data1  = Data({ a: 1 });
    const data2  = Data({ a: 2 });
    const s1     = Signal.from(() => data1.a + data2.a);

    test(s1.value);

    // This triggers an invalidation
    data1.a = 3;
    test(s1.value);

    // This triggers an invalidation
    data2.a = 6;
    test(s1.value);

    done();
});

run('Signal.from(() => data1.a + data2.a)',
[3, 5, 6],
function(test, done) {
    const data1  = Data({ a: 1 });
    const data2  = Data({ a: 2 });

    class S extends Signal {
        invalidate() {
            super.invalidate();

            // Invalid, cue 'render'...
            requestAnimationFrame(() => {
                // Test 2, 3
                test(this.value);

                // Dirty way of getting out of tests
                if (this.value === 6) { done(); }

                // This triggers an invalidation, evaluated on next animation frame
                data1.a = 4;
            });
        }
    }

    const s1 = S.from(() => data1.a + data2.a);

    // Test 1
    test(s1.value);

    // This triggers an invalidation, which is evaluated on next animation frame
    data1.a = 3;
});
