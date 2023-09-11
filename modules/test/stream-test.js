
import run      from '../test.js';
import Stream, { stop } from '../stream.js';

const assign = Object.assign;
const create = Object.create;


run('Stream...each()',
['.pipe()', 'a', 'b', 1, 2],
function(test, done) {
    const stream1 = new Stream({
        pipe: function(stream) {
            test('.pipe()')
            // Pushes nothing
            this.stream = stream;
        },

        stop: function(a, b) {
            // No need to check for .status in a pipeable, the stream
            // does that before calling it
            test(a);
            test(b);
            // A pipeable must stop the stream using imported stop()
            stop(this.stream);
        }
    });

    setTimeout(() => {
        stream1
        .each(test)
        .done(() => test(1))
        .done(() => test(2))
        .stop('a', 'b');
        done();
    }, 200);
});

run('Stream.stop()',
[0, 'a', 'b', 1, 'done', undefined, 2, 'done', 'done', 3, 4],
function(test, done) {
    const stream1 = new Stream({
        pipe: function(stream) {
            this[0] = stream;
        },

        stop: function(a, b) {
            // No need to check for .status here, the stream does that
            test(a);
            test(b);
            // A pipeable must stop the stream (if it is not itself a
            // stream, which it isn't here, it's just an object)
            stop(this[0]);
            return this;
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

run('Stream.each().start(time).stop(time)',
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

    const stream1 = new Stream({
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
    .each((count) => (count < 4 && test(count)))
    .start(now + 200)
    .stop(now + 200 + 3 * fd)
    .done(() => test('done'))
    .done(done);
});

run('Stream.start(time).stop(time).each()',
['.start()', '.stop()', '.pipe()', 1, 2, 3, 'done'],
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

    const stream1 = new Stream({
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
    .start(now + 200)
    .stop(now + 200 + 3 * fd)
    .each((count) => (count < 4 && test(count)))
    .done(() => test('done'))
    .done(done);
});

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

    const stream1 = new Stream({
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

run("Stream.of().pipe(Stream.of())", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3'], function(equals, done) {
    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);

    stream1.push(2);

    // TODO: order of done() is MAAAD!!

    stream1
    .done(() => equals('done-1'))
    .pipe(stream2)
    .done(() => equals('done-2'))
    .each(equals)
    .done(() => equals('done-3'));

    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);
    stream2.stop();
    stream1.push('never');

    done();
});

run("Stream.pipe()", [0, 1, 2, 3, 4, 'done-1', 'done-2', 'done-3', 'done-4'], function(equals, done) {
    var stream1  = Stream.of(1);
    var stream2  = Stream.of(0);

    stream1.push(2);

    const s3 = stream1
    .done(() => equals('done-1'))
    .map((n) => n)
    .done(() => equals('done-2'));

    const s4 = s3.pipe(stream2)
    .done(() => equals('done-3'))
    .each(equals)
    .done(() => equals('done-4'));

    stream1.push(undefined);
    stream1.push(3);
    stream1.push(4);
    stream2.stop();
    stream1.push(0);

    done();
});


run('Stream.broadcast().stop() to one stream',
[1,2,3,'done',undefined,4,'done','done',5,6],
function(test, done) {
    const stream1 = new Stream({
        pipe: function(output) {
            this.mynameforoutput = output;
        },

        stop: function(a, b) {
            // A pipeable must stop the stream on output 0,
            // if it is not itself a stream
            stop(this.mynameforoutput);
        }
    });

    const stream2 = stream1.broadcast();

    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.each(test);
    stream1.push(1);
    stream1.push(2);
    stream2.stop();
    stream2.done((v) => test(5));
    stream1.done((v) => test(6));

    done();
});

run('Stream.broadcast().stop() to multiple streams',
[1,1,2,2,2,3,'done',undefined,4,'done','done',5,6,7,8,9],
function(test, done) {
    const stream1 = new Stream({
        pipe: function(output) {
            this.mynameforoutput = output;
        },

        stop: function(a, b) {
            // A pipeable must stop the stream on output 0,
            // if it is not itself a stream
            stop(this.mynameforoutput);
        }
    });

    const stream2 = stream1.broadcast();

    stream2.done((v) => (test(4), test(stream1.status), test(stream2.status)));
    stream1.done((v) => (test(3), test(stream1.status), test(stream2.status)));
    stream2.each(test).done((v) => test(5));
    stream2.each(test).done((v) => test(6));
    stream1.push(1);
    stream2.each(test).done((v) => test(7));
    stream1.push(2);
    stream2.stop();
    // These fire synchronously because streams are stopped
    stream2.done((v) => test(8));
    stream1.done((v) => test(9));

    done();
});

run("Stream.broadcast({ memory: true })", [1, 2, 2, 3, 3, 'done-1', 4, 'done-2', 'done-3', 'done-4'], function(equals, done) {
    var stream    = Stream.of(0);
    stream.push(1);

    // TODO: fix order of done()
    var broadcast = stream
    .done(() => equals('done-2'))
    .broadcast({ memory: true })
    .done(() => equals('done-3'));

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

run("Stream.from({ stream, stream })", [
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
    .from({ 1: stream1, 2: stream2 })
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

run("Stream.combine({ stream, promise, constant })", [{ 1: 3, 2: 1, 3: 5 }, 'done-1', 'done-2'], function(equals, done) {
    var stream1 = Stream.of(0);
    var promise = Promise.resolve(1);

    Stream
    .from({ 1: stream1, 2: promise, 3: 5 })
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.then(done);
});

run("Stream.combine({ stream, rejected })", ['done-1', 'done-2'], function(equals, done) {
    var stream1  = Stream.of(0);
    var promise  = Promise.reject();

    Stream
    .from({ 1: stream1, 2: promise })
    .done(() => equals('done-1'))
    .each(equals)
    .done(() => equals('done-2'));

    stream1.push(3);
    stream1.stop();
    stream1.push(4);

    promise.catch(done);
});
/*
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
/*
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

/*
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

/**/
