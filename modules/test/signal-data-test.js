
import run    from '../test.js';
import Signal from '../signal.js';
import Data   from '../data.js';


run('Data.signal()', [1, 2, 2], (test, done) => {
    const object = { a: 1, b: 2 };
    const data   = Data.of(object);
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

run('Signal.from(() => data.a)', [1, 2, 2], (test, done) => {
    const object = { a: 1, b: 2 };
    const data   = Data.of(object);
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

run('Signal.from(() => data1.a + data2.a)', [3, 5, 9], (test, done) => {
    const data1  = Data.of({ a: 1 });
    const data2  = Data.of({ a: 2 });
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

run('Signal.frame(() => test(data.a))', [undefined, 0, 1], (test, done) => {
    const object = {};
    const data   = Data.of(object);
    const signal = Signal.frame(() => test(data.a));

    data.a = 0;
    requestAnimationFrame(() => {
        data.a = 1;
        requestAnimationFrame(done);
    });
});

run('Signal.frame(() => test(`${ data.a }`))', ['undefined', '0', '1'], (test, done) => {
    const object = {};
    const data   = Data.of(object);
    const signal = Signal.frame(() => test(`${ data.a }`));

    data.a = 0;
    requestAnimationFrame(() => {
        data.a = 1;
        requestAnimationFrame(done);
    });
});

run('Signal getter/setter', [1, 2], (test, done) => {
    // Object with a getter/setter ont he prototype
    class OOO {
        #thing = 1;

        constructor() {
            this.items = [];
        }

        get thing() {
            const data = Data.of(this).items;
            return data[0] ?
                // All items should have the same quantity
                data[0].thing :
                // If there are no items
                this.#thing ;
        }

        set thing(thing) {
            // Cache quantity
            this.#thing = thing;
            // Changes to `.quantity` are reflected on all items
            this.items.forEach((item) => Data.of(item).thing = thing);
        }
    }

    const object = new OOO();
    const data   = Data.of(object);
    const signal = Signal.from(() => data.thing);

    test(signal.value);

    // This should invalidate signal
    data.items = [{ thing: 2 }];

    test(signal.value);

    done();
});

/*
run('Signal subclassing', [3, 5, 6], (test, done) => {
    const data1  = Data({ a: 1 });
    const data2  = Data({ a: 2 });

    class S extends Signal {
        invalidate() {
            console.log('INV');
            super.invalidate();

            // Invalid, cue 'render'...
            requestAnimationFrame(() => {
                // Test 2, 3
                test(this.value);

console.log(this.value);

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

console.log('HEY', S.from === Signal.from);

    // This triggers an invalidation, which is evaluated on next animation frame
    data1.a = 3;
});
*/
