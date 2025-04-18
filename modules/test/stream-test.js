
import run    from '../test.js';
import Stream from '../stream/stream.js';

const assign = Object.assign;
const create = Object.create;

window.Stream = Stream;

run('Stream.of(0).each()', [0, 1], (test, done) => {
    Stream.of(0, 1)
    .each(test)
    .done(done)
    .stop();
});

run('Stream.of().stop()', [], (test, done) => {
    const stream = Stream.of()
    .done(done)
    .stop();

    // Stream is stopped, these should do nothing
    stream.push(0);
    stream.push(1);
});

run('Stream.of().each()', [0, 1], (test, done) => {
    const stream = Stream.of();

    stream
    .each(test)
    .done(done);

    stream.push(0);
    stream.push(1);
    stream.stop();

    // Stream is stopped, these should do nothing
    stream.push(2);
    stream.push(3);
});

run('Stream.of().buffer(0).each()', [0, 1, 2, 3], (test, done) => {
    const stream = Stream.of(1, 2);

    stream
    .buffer(0)
    .each(test)
    .done(done);

    stream.push(3);
    stream.stop();

    // Stream is stopped, these should do nothing
    stream.push(4);
});

run("Stream.of()", [0, 0, 0, null, false, 'done-1', 'done-2'], function(test, done) {
    const stream   = Stream.of(0);

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

    done();
});

run("Stream.of().map()", [0, 0, 0, null, false, 'done-1', 'done-2', 'done-3'], function(test, done) {
    var stream   = Stream.of(0);

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

    done();
});

run("Stream.of().slice()", [2, 3, 4, 'done-1', 'done-2', 'done-3'], function(test, done) {
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

    done();
});

run("Stream.pipe()", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3', 'done-4'], function(test, done) {
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

    done();
});

run("Stream.of().pipe(Stream.of())", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3'], function(test, done) {
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

    done();
});

run("Stream.merge(stream, stream)", [0,1,2,3,5, 'done-1', 'done-2'], function(test, done) {
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

    done();
});
