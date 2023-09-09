
import run    from "../modules/test.js";
import Stream from "../modules/stream.js";



        run('Stream.stop()', ['a', 'b', 1, 'done', undefined, 2, 'done', 'done', 3, 4], function(test, done) {
    const stream1 = new Stream({
        stop: function(a, b) {
            // No need to check for .status here, the stream does that
            test(a);
            test(b);
            // A producer must stop the stream on output 0,
            // if it is not itself a stream
            stop(this[0]);
            return this;
        }
    });

    const stream2 = stream1.map((a) => (console.log('a', a), a));

    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(2), test(stream1.status), test(stream2.status)));
    stream2.each((v) => console.log('EACH', v));
    stream2.stop('a', 'b');
    stream2.done((v) => test(3));
    stream1.done((v) => test(4));

    // It is permitted to stop more than once, if status is not done. In
    // this scenario the head stop() may not have stopped the stream,
    // which may be open for rescheduling
    stream1.stop('good');
    stream1.stop('bye');

    done();
});

run('SubStream.stop()', ['a', 'b', 1, 'done', undefined, 2, 'done', undefined, 3, 'done', 'done', 4, 'done', 'done'], function(test, done) {
    function SubStream() {}

    SubStream.prototype = assign(create(Stream.prototype), {
        stop: function(a, b) {
            // Must check for status, someone may call .stop() directly on
            // substream instance
            if (this.status === 'done') { return this; }
            test(a);
            test(b);
            stop(this);
            return this;
        }
    });

    // ------

    const stream1 = new SubStream();
    const stream2 = stream1.map((a) => (console.log('a', a), a));
    const stream3 = stream2.map((b) => (console.log('b', b), a));

    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(2), test(stream1.status), test(stream2.status)));
    stream3.stop('a', 'b');

    // It is permitted to stop more than once, although if stop has not
    // been delayed this has no effect because .status === 'done'.
    stream1.stop('good');
    stream1.stop('bye');

    done(done);
});

run('SubStream.stop() delayed stop',
['a', 'b', 'c', undefined, 'd', undefined, 1, 'done', undefined, 2, 'done', undefined, 3, 'done', 'done', 4, 'done', 'done', 5],
function(test, done) {
    function SubStream() {}

    SubStream.prototype = assign(create(Stream.prototype), {
        stop: function(a, b) {
            // Must check for status, someone may call .stop() directly on
            // substream instance
            if (this.status === 'done') { return this; }
            test(a);
            test(b);
            // Delayed stop
            setTimeout(() => stop(this), 500);
            return this;
        }
    });

    // ------

    const stream1 = new SubStream();
    const stream2 = stream1.map((a) => (console.log('a', a), a));
    const stream3 = stream2.map((b) => (console.log('b', b), a));

    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(2), test(stream1.status), test(stream2.status)));
    stream3.done((v) => test(5));
    stream3.stop('a', 'b');

    // It is permitted to stop more than once, if status is not done. In
    // this scenario the head stop() may not have stopped the stream,
    // which may be open for rescheduling
    stream1.stop('c');
    stream1.stop('d');

    stream3.done(done);
});



run("Stream.of()", [0, 0, 0, null, false, 'done-1', 'done-2'], function(equals, done) {
    var stream   = Stream.of(0);

    stream.push(0);

    stream
    .done(() =>      equals('done-1'))
    .each(equals)
    .done(() =>      equals('done-2'));

    stream.push(0);
    stream.push(undefined);
    stream.push(null);
    stream.push(false);
    stream.stop();
    stream.push(0);

    done();
});

run("Stream.of().map()", [0, 0, 0, null, false, 'done-1', 'done-2', 'done-3'], function(equals, done) {
    var stream   = Stream.of(0);

    stream.push(0);

    stream
    .done(() => equals('done-1'))
    .map((n) => n)
    .done(() => equals('done-2'))
    .each(equals)
    .done(() => equals('done-3'));

    stream.push(0);
    stream.push(undefined);
    stream.push(null);
    stream.push(false);
    stream.stop();
    stream.push(0);

    done();
});

run("Stream.pipe()", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3'], function(equals, done) {
    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);

    stream1.push(2);

    // TODO: order of done() is MAAAD!!

    stream1
    .done(() => equals('done-1'))
    .pipe(stream2)
    .done(() => equals('done-3'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);
    stream2.stop();
    stream1.push(0);

    done();
});

run("Stream.pipe()", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3', 'done-4'], function(equals, done) {
    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);
//stream1.id = 'STREAM 1';
//stream2.id = 'STREAM 3';
    stream1.push(2);

    const s3 = stream1
    .done(() => equals('done-2'))
    .map((n) => n)
    .done(() => equals('done-1'));
//s3.id = 'STREAM 2';
    const s4 = s3.pipe(stream2)
    .done(() => equals('done-4'))
    .each(equals)
    .done(() => equals('done-3'));
//s4.id = 'STREAM 4';
    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);
    stream2.stop();
    stream1.push(0);

    done();
});

run("Stream.broadcast()", [0, 1, 2, 3, 3, 'done-1', 4, 'done-2', 'done-3', 'done-4'], function(equals, done) {
    var stream    = Stream.of(0);
    stream.push(1);

    // TODO: fix order of done()
    var broadcast = stream
    .done(() => equals('done-3'))
    .broadcast()
    .done(() => equals('done-2'));

    var end1 = broadcast
    .each(equals)
    .done(() => equals('done-1'));

    stream.push(2);

    var end2 = broadcast
    .each(equals)
    .done(() => equals('done-4'));

    stream.push(3);
    end1.stop();
    stream.push(4);
    end2.stop();
    stream.push(5);

    done();
});

run("Stream.broadcast({ memory: true })", [1, 2, 2, 3, 3, 'done-1', 4, 'done-2', 'done-3', 'done-4'], function(equals, done) {
    var stream    = Stream.of(0);
    stream.push(1);

    // TODO: fix order of done()
    var broadcast = stream
    .done(() => equals('done-3'))
    .broadcast({ memory: true })
    .done(() => equals('done-2'));

    var end1 = broadcast
    .each(equals)
    .done(() => equals('done-1'));

    stream.push(2);

    var end2 = broadcast
    .each(equals)
    .done(() => equals('done-4'));

    stream.push(3);
    end1.stop();
    stream.push(4);
    end2.stop();
    stream.push(5);

    done();
});

run("Stream.broadcast({ hot: true })", [2, 3, 'done-1'], function(equals, done) {
    var stream    = Stream.of(0);
    stream.push(1);

    var broadcast = stream
    // This is never called, as hot stream remains live
    .done(() => equals('never called'))
    .broadcast({ hot: true });

    var end = broadcast
    // This is never called, as hot stream remains live
    .done(() => equals('never called'))
    .each(equals)
    .done(() => equals('done-1'));

    stream.push(2);
    stream.push(3);
    end.stop();
    stream.push(4);

    done();
});

run("Stream.combine({ stream, stream })", [
    { 1: 0, 2: 1 },
    { 1: 2, 2: 1 },
    { 1: 2, 2: 3 },
    { 1: 2, 2: 5 },
    'done-1',
    'done-2'
], function(equals, done) {
    var stream1 = Stream.of(0);
    var stream2 = Stream.of(1);

    Stream
    .combine({ 1: stream1, 2: stream2 })
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(2);
    stream2.push(3);
    stream1.stop();
    stream1.push(4);
    stream2.push(5);
    stream2.stop();
    stream2.push(6);

    done();
}, 6);

run("Stream.combine({ stream, promise, constant })", [{ 1: 3, 2: 1, 3: 5 }, 'done-1', 'done-2'], function(equals, done) {
    var stream1 = Stream.of(0);
    var promise = Promise.resolve(1);

    Stream
    .combine({ 1: stream1, 2: promise, 3: 5 })
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.then(done);
}, 3);

run("Stream.combine({ stream, rejected })", ['done-1', 'done-2'], function(equals, done) {
    var stream1  = Stream.of(0);
    var promise  = Promise.reject();

    Stream
    .combine({ 1: stream1, 2: promise })
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.catch(done);
});

run("Stream.merge(stream, stream)", [0,1,2,3,5, 'done-1', 'done-2'], function(equals, done) {
    var stream1 = Stream.of(0);
    var stream2 = Stream.of(1);

    Stream
    .merge(stream1, stream2)
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(2);
    stream2.push(3);
    stream1.stop();
    stream1.push(4);
    stream2.push(5);
    stream2.stop();
    stream2.push(6);

    done();
});

run("Stream.merge(stream, promise, array)", [0,1,2,3,4, 'done-1', 'done-2', 'done-3'], function(equals, done) {
    var stream   = Stream.of(0);
    var promise  = Promise.resolve(7);
    var array    = [1,2,3];

    stream.done(() => equals('done-1'));

    var output = Stream
    .merge(stream, promise, array)
    .done(() => equals('done-2'))
    .each(equals)
    .done(() => equals('done-3'));

    stream.push(4);
    stream.stop();
    stream.push(5);
    output.stop();
    stream.push(6);

    promise.then(done);
});

run("Stream.batch(time)", [0,1,2,3,4,'done',5,6,7,8,9,'done'], function(equals, done) {
    var stream = Stream.batch(0.2);

    stream.each((batch) => {
        batch
        .each(equals)
        .done(() => equals('done'));
    });

    stream.push(0);
    stream.push(1);
    stream.push(2);
    stream.push(3);
    stream.push(4);

    setTimeout(() => {
        stream.push(5);
        stream.push(6);
        stream.push(7);
        stream.push(8);
        stream.push(9);
    }, 400);

    setTimeout(done, 800);
});
