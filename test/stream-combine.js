
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Stream from '../modules/stream.js';


Deno.test('Stream.combine()', function() {
    const expected = [{ a: 2, b: 3 }, { a: 4, b: 3 }];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const a = Stream.of();
    const b = Stream.of();
    Stream.combine({ a, b }).each(test);

    a.push(1);
    a.push(2);
    b.push(3);
    a.push(4);

    equals(i, expected.length);
});
