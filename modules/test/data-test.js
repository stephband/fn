
import run    from '../test.js';
import Signal from '../signal.js';
import Data   from '../data.js';


const define = Object.defineProperties;


run('Data.of({ writable: false })', [[]], (test, done) => {
    const object = define({ a: 1, b: 2 }, { c: { value: [] } });
    const data   = Data.of(object);

    // Can you access non-writable properties of data when they themselves
    // return data proxies?
    try      { test(data.c); }
    catch(e) { console.error(e); }

    done();
});
