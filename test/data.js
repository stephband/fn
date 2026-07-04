
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';


const define = Object.defineProperties;


Deno.test('Data.of({ writable: false })', function() {
    const object = define({ a: 1, b: 2 }, { c: { value: [] } });
    const data   = Data.of(object);

    // Can you access non-writable properties of data when they themselves
    // return data proxies? (Throws if not.)
    equals(data.c, []);
});
