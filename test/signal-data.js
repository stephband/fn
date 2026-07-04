
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';
import './request-animation-frame.js';


Deno.test('Data.signal()', function() {
    const expected = [1, 2, 2];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

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

    equals(i, expected.length);
});

Deno.test('Signal.from(() => data.a)', function() {
    const expected = [1, 2, 2];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

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

    equals(i, expected.length);
});

Deno.test('Signal.from(() => data1.a + data2.a)', function() {
    const expected = [3, 5, 9];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

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

    equals(i, expected.length);
});

Deno.test('Signal.frame(() => test(data.a))', async function() {
    const expected = [undefined, 0, 1];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const object = {};
    const data   = Data.of(object);
    const signal = Signal.frame(() => test(data.a));

    data.a = 0;
    await new Promise((resolve) => requestAnimationFrame(() => {
        data.a = 1;
        requestAnimationFrame(resolve);
    }));

    equals(i, expected.length);
});

Deno.test('Signal.frame(() => test(`${ data.a }`))', async function() {
    const expected = ['undefined', '0', '1'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const object = {};
    const data   = Data.of(object);
    const signal = Signal.frame(() => test(`${ data.a }`));

    data.a = 0;
    await new Promise((resolve) => requestAnimationFrame(() => {
        data.a = 1;
        requestAnimationFrame(resolve);
    }));

    equals(i, expected.length);
});

Deno.test('Signal getter/setter', function() {
    const expected = [1, 2];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    // Object with a getter/setter on the prototype
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

    equals(i, expected.length);
});
