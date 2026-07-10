
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';


const define = Object.defineProperties;

/*
Deno.test('Data.of({ writable: false })', function() {
    const object = define({ a: 1, b: 2 }, { c: { value: [] } });
    const data   = Data.of(object);

    // Can you access non-writable properties of data when they themselves
    // return data proxies? (Throws if not.)
    equals(data.c, []);
});
*/

Deno.test('Data.of(array).length', function() {
    const array = [];
    const a     = { name: 'a' };
    const b     = { name: 'b' };
    const data  = Data.of(array);

    data.push(a);
    equals(data.length, 1);
    data.pop();
    equals(data.length, 0);

    data.push(a, b);
    equals(data.length, 2);
    data.length = 0;
    equals(data.length, 0);
    equals(data[0], undefined);
    equals(data[1], undefined);

    array.push(a, b);
    equals(data.length, 2);
    array.length = 0;
    equals(data.length, 0);
    equals(data[0], undefined);
    equals(data[1], undefined);
});

Deno.test('Data.of(array).length gnarly edge case', function() {
    const array = [];
    const a     = { name: 'a' };
    const data  = Data.of(array);

    data.push(a);
    // Does not read from the property signal because !Signal.evaluating
    equals(data[0], Data.of(a));
    // Does read from the property signal because Signal.evaluating
    Signal.frame(() => { equals(data[0], Data.of(a)); });
    // So now property signal #value caches are set, empty the array
    data.length = 0;
    // Add stuff back in.
    data.push(a);
    //
    equals(array[0], a);
});

Deno.test('Data.of(object).property delete gnarly edge case', function() {
    const object = {};
    const a      = { name: 'a' };
    const data   = Data.of(object);

    data.property = a;
    // Does not read from the property signal because !Signal.evaluating
    equals(data.property, Data.of(a));
    // Does read from the property signal because Signal.evaluating
    Signal.frame(() => { equals(data.property, Data.of(a)); });
    // So now property signal #value caches are set, empty the array
    delete data.property;
    // Add stuff back in.
    data.property = a;
    //
    equals(object.property, a);
});

Deno.test('Data.of(array).includes()', function() {
    const array = [];
    const a     = { name: 'a' };
    const b     = { name: 'b' };
    const data  = Data.of(array);

    array.push(a);
    assert(array[0] === a);
    assert(data[0] === Data.of(a));

    data.push(b);
    assert(array[1] === b);
    assert(data[1] === Data.of(b));

    assert(array.includes(a));
    assert(array.includes(b));
    assert(!data.includes(a));
    assert(!data.includes(b));
});
