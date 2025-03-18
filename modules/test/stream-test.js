
import run    from '../test.js';
import Stream from '../stream/stream.js';

const assign = Object.assign;
const create = Object.create;

window.Stream = Stream;

run('new Stream(fn).each()', [0], (test, done) => {
    new Stream((push, stop) => {
        push(0);
        stop();
    })
    .each(test)
    .done(done);
});

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

run('Stream.from(producer).each()', ['a', 'b', 1, 2], (test, done) => {
    const stream1 = Stream.from({
        // This is how to create a readable stream. This particular stream does
        // nothing on .start(), however.
        pipe: Stream.prototype.pipe,

        stop: function(a, b) {
            test(a);
            test(b);
            Stream.prototype.stop.apply(this);
        }
    });

    setTimeout(() => {
        let n = stream1
        .each(test)
        .done(() => test(1))
        .done(() => test(2))
        .stop('a', 'b')
        .done(done);
    }, 0);
});

run('Stream.stop()', [0, 'a', 'b', 1, 'done', undefined, 2, 'done', 'done', 3, 4], (test, done) => {
    const stream1 = Stream.from({
        pipe: Stream.prototype.pipe,

        stop: function(a, b) {
            // No need to check for .status here, the stream does that
            test(a);
            test(b);
            Stream.prototype.stop.apply(this);
        }
    });

    const stream2 = stream1.map((a) => a);

    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(2), test(stream1.status), test(stream2.status)));
    stream2.each(test);
    stream1.push(0);
    stream2.stop('a', 'b');
    stream1.push(5);
    stream2.done((v) => test(3));
    stream1.done((v) => test(4));

    // It is permitted to stop more than once, if status is not done. In
    // this scenario the head stop() may not have stopped the stream,
    // which may be open for rescheduling
    stream1.stop('good');
    stream1.stop('bye');

    done();
});
/*
run('Stream subclass TimedStream().each().start(time).stop(time)', ['.start()', '.stop()', 1, 2, 3, 'done'], (test, done) => {
    function start(stream) {
        stream.frame = requestAnimationFrame((time) => {
            // Poll frames until time is beyond stream startTime
            if (time < stream.startTime) {
                start(stream);
                return;
            }

            if (stream.stopTime < time) {
                Stream.prototype.stop.apply(stream);
                return;
            }

            Stream.push(stream, ++stream.count);
            start(stream);
        });
    }

    function TimedStream() {
        this.count = 0;
    }

    assign(TimedStream.prototype, Stream.prototype, {
        start: function(time) {
            // If .each is attached, it implicitly calls .start() with no
            // arguments. We don't want to respond to that. This is messy. In
            // the real world .start() should be scheduled before attaching a
            // consumer. Can we live with a requirement like that, though?
            if (time === undefined) return;
            test('.start()', time);
            this.startTime = time;
            start(this);
            return this;
        },

        stop: function(time) {
            test('.stop()', time);
            this.stopTime = time;
            return this;
        }
    });

    const now = performance.now();
    const fd  = 16.666666666667;

    new TimedStream()
    .each((count) => (count < 4 && test(count)))
    .start(now + 200)
    .stop(now + 200 + 4 * fd)
    .done(() => test('done'))
    .done(done);
});

run('Stream subclass TimedStream().start(time).stop(time).each()', ['.start()', '.stop()', 1, 2, 3, 'done'], function(test, done) {
    function start(stream) {
        stream.frame = requestAnimationFrame((time) => {
            // Poll frames until time is beyond stream startTime
            if (time < stream.startTime) {
                start(stream);
                return;
            }

            if (stream.stopTime < time) {
                Stream.prototype.stop.apply(stream);
                return;
            }

            Stream.push(stream, ++stream.count);
            start(stream);
        });
    }

    function TimedStream() {
        this.count = 0;
    }

    assign(TimedStream.prototype, Stream.prototype, {
        start: function(time) {
            // If .each is attached, it implicitly calls .start() with no
            // arguments. We don't want to respond to that. This is messy. In
            // the real world .start() should be scheduled before attaching a
            // consumer. Can we live with a requirement like that, though?
            if (time === undefined) return;
            test('.start()', time);
            this.startTime = time;
            start(this);
            return this;
        },

        stop: function(time) {
            test('.stop()', time);
            this.stopTime = time;
            return this;
        }
    });

    const now = performance.now();
    const fd  = 16.666666666667;

    new TimedStream()
    .start(now + 200)
    .stop(now + 200 + 4 * fd)
    .each((count) => (count < 4 && test(count)))
    .done(() => test('done'))
    .done(done);
});
*/

/*
run('Stream.each() ... .start(time).stop(time)',
['.pipe()', '.start()', '.stop()', 1, 2, 3, 'done'],
function(test, done) {
    // Make a simple frame stream
    function start(stream) {
        stream.frame = requestAnimationFrame((time) => {
            // Poll frames until time is beyond stream startTime
            if (time < stream.startTime) {
                start(stream);
                return;
            }

            play(stream, time);
        });
    }

    function play(stream, time) {
        // Push the frame
        stream.push(++stream.count);
        if (stream.stopTime <= time) {
            stop(stream);
            return;
        }
        stream.frame = requestAnimationFrame((time) => play(stream, time));
    }

    const now = performance.now();
    const fd = 16.666666666667;

    const stream1 = Stream.from({
        pipe: function(stream) {
            test('.pipe()');
            this.stream = stream;
            stream.count = 0;
            if (this.startTime !== undefined) {
                stream.startTime = this.startTime;
                stream.stopTime  = this.stopTime;
                start(stream);
            }
        },

        start: function(time) {
            test('.start()');
            if (this.stream) {
                this.stream.startTime = time;
                start(this.stream);
            }
            else {
                this.startTime = time;
            }
        },

        stop: function(time) {
            test('.stop()');
            if (this.stream) {
                this.stream.stopTime = time;
            }
            else {
                this.stopTime = time;
            }
        }
    })
    .map((count) => count)
    .each((count) => (count < 4 && test(count)))
    .done(() => test('done'));

    setTimeout(() => {
        stream1
        .start(now + 200)
        .stop(now + 200 + 3 * fd)
        .done(done);
    }, 200);
});

run('SubStream.stop() unconsumed streams', [
    'a', 'b',
    //1, 'done', undefined,
    //2, 'done', undefined,
    //3, 'done', 'done',
    //4, 'done', 'done',
    'good',
    'bye'
], function(test, done) {
    function SubStream() {}

    SubStream.prototype = assign(create(Stream.prototype), {
        // pipe not called for this test, as stream is never consumed
        pipe: test,

        stop: function(a, b) {
            // Must check for status, someone may call .stop() directly on
            // substream instance
            test(a);
            if (this.status === 'done') { return this; }
            test(b);
            stop(this);
            return this;
        }
    });

    // ------

    const stream1 = new SubStream();
    // These console logs should never be seen
    const stream2 = stream1.map((a) => (console.log('a', a), a));
    const stream3 = stream2.map((b) => (console.log('b', b), a));

    // Unconsumed streams do not fire .done()
    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(2), test(stream1.status), test(stream2.status)));
    stream3.stop('a', 'b');

    // It is permitted to stop more than once, although if stop has not
    // been delayed this has no effect because .status === 'done'.
    stream1.stop('good');
    stream1.stop('bye');

    // Should not be fired
    stream3.done(test);
    done();
});

run('SubStream.stop() delayed stop',
[0, 'a', 'b', 'c', undefined, 'd', undefined, 1, 'done', undefined, 2, 'done', undefined, 3, 'done', 'done', 4, 'done', 'done', 5],
function(test, done) {
    function SubStream() {}

    SubStream.prototype = assign(create(Stream.prototype), {
        pipe: function(output) {
            // pipe must publish indexed outputs
            this[0] = output;
        },

        stop: function(a, b) {
            // Must check for status, someone may call .stop() directly on
            // substream instance
            test(a);
            if (this.status === 'done') { return this; }
            test(b);
            // Delayed stop
            setTimeout(() => {
                if (this.status === 'done') { return this; }
                stop(this);
            }, 500);
            return this;
        }
    });

    // ------

    const stream1 = new SubStream();
    const stream2 = stream1.map((a) => a);
    const stream3 = stream2.map((a) => a);

    stream1.done((v) => (test(1), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(2), test(stream1.status), test(stream2.status)));

    stream3
    .each(test)
    .done((v) => test(5))
    .done(done);

    stream1.push(0);
    stream3.stop('a', 'b');

    // It is permitted to stop more than once, if status is not done. In
    // this scenario the head stop() may not have stopped the stream,
    // which may be open for rescheduling
    stream1.stop('c');
    stream1.stop('d');
});

run('SubStream.stop() delayed start???', [1], function(test, done) {
    function SubStream() {}

    SubStream.prototype = assign(create(Stream.prototype), {
        pipe: function(output) {
            this[0] = output;
        },

        stop: function(a, b) {
            // Must check for status
            if (this.status === 'done') { return this; }
            stop(this);
            return this;
        }
    });

    // ------

    const stream1 = new SubStream();
    const stream2 = stream1.map((a) => a);
    stream1.push(0);
    stream2.each(test).done(done);

    setTimeout(() => {
        stream1.push(1);
        stream1.stop();
    }, 500)
});

run("Stream.from({ stream, stream })", [
    { 1: 0, 2: 1 },
    { 1: 2, 2: 1 },
    { 1: 2, 2: 3 },
    { 1: 2, 2: 5 },
    'done-1',
    'done-2'
], function(test, done) {
    var stream1 = Stream.of(0);
    var stream2 = Stream.of(1);

    Stream
    .from({ 1: stream1, 2: stream2 })
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

run("Stream.combine({ stream, promise, constant })", [{ 1: 3, 2: 1, 3: 5 }, 'done-1', 'done-2'], function(test, done) {
    var stream1 = Stream.of(0);
    var promise = Promise.resolve(1);

    Stream
    .from({ 1: stream1, 2: promise, 3: 5 })
    .done(() => test('done-1'))
    .each(test)
    .done(() => test('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.then(done);
});

run("Stream.combine({ stream, rejected })", ['done-1', 'done-2'], function(test, done) {
    var stream1  = Stream.of(0);
    var promise  = Promise.reject();

    Stream
    .from({ 1: stream1, 2: promise })
    .done(() => test('done-1'))
    .each(test)
    .done(() => test('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.catch(done);
});
/*
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
/*
run("Stream.merge(stream, promise, array)", [0,1,2,3,4, 'done-1', 'done-2', 'done-3'], function(test, done) {
    var stream   = Stream.of(0);
    var promise  = Promise.resolve(7);
    var array    = [1,2,3];

    stream.done(() => test('done-1'));

    var output = Stream
    .merge(stream, promise, array)
    .done(() => test('done-2'))
    .each(test)
    .done(() => test('done-3'));

    stream.push(4);
    stream.stop();
    stream.push(5);
    output.stop();
    stream.push(6);

    promise.then(done);
});

/*
run("Stream.batch(time)", [0,1,2,3,4,'done',5,6,7,8,9,'done'], function(test, done) {
    var stream = Stream.batch(0.2);

    stream.each((batch) => {
        batch
        .each(test)
        .done(() => test('done'));
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

/**/
