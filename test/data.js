
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

Deno.test('Data.of([]).includes()', function() {
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
