
import tests  from "../modules/test.js";
import Stream from "../modules/stream.js";

tests('Stream()', function(test, log) {
    test("Stream.of()", function(equals, done) {
        var expected = [0, 0, 0, null, false];
        var stream   = Stream.of(0);

        stream.push(0);

        stream
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(0);
        stream.push(undefined);
        stream.push(null);
        stream.push(false);
        stream.stop();
        stream.push(0);

        done();
    }, 7);

    test("Stream.of().map()", function(equals, done) {
        var expected = [0, 0, 0, null, false];
        var stream   = Stream.of(0);

        stream.push(0);

        stream
        .done(() => equals(0, expected.length))
        .map((n) => n)
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(0);
        stream.push(undefined);
        stream.push(null);
        stream.push(false);
        stream.stop();
        stream.push(0);

        done();
    }, 8);

    test("Stream.pipe()", function(equals, done) {
        var expected = [0, 1, 2, 3, 4];
        var stream1  = Stream.of(1);
        var stream2  = Stream.of(0);

        stream1.push(2);

        stream1
        .done(() => equals(0, expected.length))
        .pipe(stream2)
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream1.push(undefined);
        stream1.push(3);
        stream1.push(4);
        stream2.stop();
        stream1.push(0);

        done();
    }, 8);

    test("Stream.pipe()", function(equals, done) {
        var expected = [0, 1, 2, 3, 4];
        var stream1  = Stream.of(1);
        var stream2  = Stream.of(0);
//stream1.id = 'STREAM 1';
//stream2.id = 'STREAM 3';
        stream1.push(2);

        const s3 = stream1
        .done(() => equals(0, expected.length))
        .map((n) => n)
        .done(() => equals(0, expected.length));
//s3.id = 'STREAM 2';
        const s4 = s3.pipe(stream2)
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));
//s4.id = 'STREAM 4';
        stream1.push(undefined);
        stream1.push(3);
        stream1.push(4);
        stream2.stop();
        stream1.push(0);

        done();
    }, 9);

    test("Stream.broadcast()", function(equals, done) {
        var expected = [0, 1, 2, 3, 3, 4];
        var stream    = Stream.of(0);
        stream.push(1);

        var broadcast = stream
        .done(() => equals(0, expected.length))
        .broadcast()
        .done(() => equals(0, expected.length));

        var end1 = broadcast
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(1, expected.length));

        stream.push(2);

        var end2 = broadcast
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(3);
        end1.stop();
        stream.push(4);
        end2.stop();
        stream.push(5);

        done();
    }, 10);

    test("Stream.broadcast({ memory: true })", function(equals, done) {
        var expected = [1, 2, 2, 3, 3, 4];
        var stream    = Stream.of(0);
        stream.push(1);

        var broadcast = stream
        .done(() => equals(0, expected.length))
        .broadcast({ memory: true })
        .done(() => equals(0, expected.length));

        var end1 = broadcast
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(1, expected.length));

        stream.push(2);

        var end2 = broadcast
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(3);
        end1.stop();
        stream.push(4);
        end2.stop();
        stream.push(5);

        done();
    }, 10);

    test("Stream.broadcast({ hot: true })", function(equals, done) {
        var expected = [2, 3];
        var stream    = Stream.of(0);
        stream.push(1);

        var broadcast = stream
        // This is never called, as hot stream remains live
        .done(() => equals(0, expected.length))
        .broadcast({ hot: true });

        var end = broadcast
        // This is never called, as hot stream remains live
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(2);
        stream.push(3);
        end.stop();
        stream.push(4);

        done();
    }, 3);

    test("Stream.combine({ stream, stream })", function(equals, done) {
        var expected = [
            { 1: 0, 2: 1 },
            { 1: 2, 2: 1 },
            { 1: 2, 2: 3 },
            { 1: 2, 2: 5 }
        ];

        var stream1 = Stream.of(0);
        var stream2 = Stream.of(1);

        Stream
        .combine({ 1: stream1, 2: stream2 })
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream1.push(2);
        stream2.push(3);
        stream1.stop();
        stream1.push(4);
        stream2.push(5);
        stream2.stop();
        stream2.push(6);

        done();
    }, 6);

    test("Stream.combine({ stream, promise, constant })", function(equals, done) {
        var expected = [
            { 1: 3, 2: 1, 3: 5 }
        ];

        var stream1 = Stream.of(0);
        var promise = Promise.resolve(1);

        Stream
        .combine({ 1: stream1, 2: promise, 3: 5 })
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream1.push(3);
        stream1.stop();
        stream1.push(4);

        promise.then(done);
    }, 3);

    test("Stream.combine({ stream, rejected })", function(equals, done) {
        var expected = [];
        var stream1  = Stream.of(0);
        var promise  = Promise.reject();

        Stream
        .combine({ 1: stream1, 2: promise })
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream1.push(3);
        stream1.stop();
        stream1.push(4);

        promise.catch(done);
    }, 2);

    test("Stream.merge(stream, stream)", function(equals, done) {
        var expected = [0,1,2,3,5];

        var stream1 = Stream.of(0);
        var stream2 = Stream.of(1);

        Stream
        .merge(stream1, stream2)
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream1.push(2);
        stream2.push(3);
        stream1.stop();
        stream1.push(4);
        stream2.push(5);
        stream2.stop();
        stream2.push(6);

        done();
    }, 7);

    test("Stream.merge(stream, promise, array)", function(equals, done) {
        var expected = [0,1,2,3,4];

        var stream   = Stream.of(0);
        var promise  = Promise.resolve(7);
        var array    = [1,2,3];

        stream.done(() => equals(0, expected.length));

        var output = Stream
        .merge(stream, promise, array)
        .done(() => equals(0, expected.length))
        .each((value) => equals(expected.shift(), value))
        .done(() => equals(0, expected.length));

        stream.push(4);
        stream.stop();
        stream.push(5);
        output.stop();
        stream.push(6);

        promise.then(done);
    }, 8);

    test("Stream.batch(time)", function(equals, done) {
        var expected = [0,1,2,3,4,5,6,7,8,9];
        var expectedLengths = [5,0];

        var stream = Stream.batch(0.2);

        stream.each((batch) => {
            batch
            .each((value) => equals(expected.shift(), value))
            .done(() => equals(expectedLengths.shift(), expected.length));
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
    }, 12);

    test("Stream.writeable(fn)", function(equals, done) {
        var expected = [0,1,2,3,4];
        var stream = Stream.writeable((stream) =>
            stream.each((value) => equals(expected.shift(), value))
        );

        stream.push(0);
        stream.push(1);
        stream.push(2);
        stream.push(3);
        stream.push(4);

        equals(0, expected.length);

        done();
    }, 6);
});
