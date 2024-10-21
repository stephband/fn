
import run    from '../test.js';
import Stream from '../stream.js';

const assign = Object.assign;
const create = Object.create;

window.Stream = Stream;

run('Stream.combine()', [{ a: 2, b: 3 }, { a: 4, b: 3 }], (test, done) => {
    const a = Stream.of();
    const b = Stream.of();
    Stream.combine({ a, b }).each(test);

    a.push(1);
    a.push(2);
    b.push(3);
    a.push(4);

    done();
});
