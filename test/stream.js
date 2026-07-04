
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Stream from '../modules/stream/stream.js';


Deno.test('Stream.of(0).each()', function() {
    const expected = [0, 1];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    Stream.of(0, 1)
    .each(test)
    .stop();

    equals(i, expected.length);
});

Deno.test('Stream.of().stop()', function() {
    const expected = [];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const stream = Stream.of()
    .each(test)
    .stop();

    // Stream is stopped, these should do nothing
    stream.push(0);
    stream.push(1);

    equals(i, expected.length);
});

Deno.test('Stream.of().each()', function() {
    const expected = [0, 1];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const stream = Stream.of();

    stream.each(test);

    stream.push(0);
    stream.push(1);
    stream.stop();

    // Stream is stopped, these should do nothing
    stream.push(2);
    stream.push(3);

    equals(i, expected.length);
});

Deno.test('Stream.of().buffer(0).each()', function() {
    const expected = [0, 1, 2, 3];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const stream = Stream.of(1, 2);

    stream
    .buffer(0)
    .each(test);

    stream.push(3);
    stream.stop();

    // Stream is stopped, these should do nothing
    stream.push(4);

    equals(i, expected.length);
});

Deno.test('Stream.of()', function() {
    const expected = [0, 0, 0, null, false, 'done-1', 'done-2'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    const stream = Stream.of(0);

    stream.push(0);

    stream
    .done(() => test('done-1'))
    .each(test)
    .done(() => test('done-2'));

    stream.push(0);
    stream.push(undefined);
    stream.push(null);
    stream.push(false);
    stream.stop();
    stream.push(0);

    equals(i, expected.length);
});

Deno.test('Stream.of().map()', function() {
    const expected = [0, 0, 0, null, false, 'done-1', 'done-2', 'done-3'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    var stream = Stream.of(0);

    stream.push(0);

    stream
    .done(() => test('done-1'))
    .map((n) => n)
    .done(() => test('done-2'))
    .each(test)
    .done(() => test('done-3'));

    stream.push(0);
    stream.push(undefined);
    stream.push(null);
    stream.push(false);
    stream.stop();
    stream.push(0);

    equals(i, expected.length);
});

Deno.test('Stream.of().slice()', function() {
    const expected = [2, 3, 4, 'done-1', 'done-2', 'done-3'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    var stream = Stream.of(0);

    stream.push(1);

    stream
    .done(() => test('done-1'))
    .slice(2, 5)
    .done(() => test('done-2'))
    .each(test)
    .done(() => test('done-3'));

    stream.push(2);
    stream.push(3);
    stream.push(4);
    stream.push(5);
    stream.push(6);

    equals(i, expected.length);
});

Deno.test('Stream.pipe()', function() {
    const expected = [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3', 'done-4'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);

    stream1.push(2);

    const s3 = stream1
    .done(() => test('done-1'))
    .map((n) => n)
    .done(() => test('done-2'));

    const s4 = s3.pipe(stream2)
    .done(() => test('done-3'))
    .each(test)
    .done(() => test('done-4'));

    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);
    stream2.stop();
    stream1.push(0);

    equals(i, expected.length);
});

Deno.test('Stream.of().pipe(Stream.of())', function() {
    const expected = [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);

    stream1.push(2);

    stream1
    .done(() => test('done-1'))
    .pipe(stream2)
    .done(() => test('done-2'))
    .each(test)
    .done(() => test('done-3'));

    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);

    stream2.stop();
    stream1.push('never');

    equals(i, expected.length);
});

Deno.test('Stream.merge(stream, stream)', function() {
    const expected = [0, 1, 2, 3, 5, 'done-1', 'done-2'];
    let i = 0;
    const test = (value) => equals(value, expected[i++]);

    var stream1 = Stream.of(0);
    var stream2 = Stream.of(1);

    Stream
    .merge(stream1, stream2)
    .done(() => test('done-1'))
    .each(test)
    .done(() => test('done-2'));

    stream1.push(2);
    stream2.push(3);
    stream1.stop();
    stream1.push(4);
    stream2.push(5);
    stream2.stop();
    stream2.push(6);

    equals(i, expected.length);
});
