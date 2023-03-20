
import tests from "../../fn/modules/test.js";

import { Observer } from '../../fn/observer/observer.js';
import gets     from '../modules/gets.js';

tests('gets', function(test, log) {
    test("gets()", function(equals, done) {
        const expected = [
            'value',
            'child',
            'child',
            'child.value',
            'child',
            'child.value',
            'child.value',
            'child',
            'child.value',
            'model.method()',
            ['value', 'child', 'child.value']
        ];

        /* ------------------------------------------ */
        function Model(value, child) {
            this.value = value;
            this.child = child;
        }

        Model.prototype.method = function() {
            equals(expected.shift(), 'model.method()');
            return this;
        };

        const object = new Model(0, new Model('child'));
        const data = Observer(object);
        /* ------------------------------------------ */


        const paths = [];

        const got = gets(object);

        got.reduce((check, path) => {
            equals(expected.shift(), path);

            // Check for paths traversed while getting to the end of the
            // path - is this path an extension of the last?
            const last = paths[paths.length - 1];
            if (check && last.length < path.length && path.startsWith(last)) {
                --paths.length;
            }

            if (!paths.includes(path)) {
                paths.push(path);
                // Signal to next reduce iteration that we just pushed a
                // path and therefore the next path should be checked as
                // an extension of this one
                return true;
            }
        });

        // value
        const a = data.value;

        // value
        const k = data.child;

        // child
        // child.value
        const b = data.child.value;

        // child
        const child = data.child;

        // child.value
        // child.value
        const c = child.value;
        const j = child.value;

        data.child = {};

        // Should not log
        const d = child.value;

        // child
        // child.value
        const e = data.child.value;

        // Should not log, because method is on the prototype
        const f = data.method;

        // Should log model.method()
        const g = data.method();

        got.stop();

        // Should not log
        const h = data.value;

        equals(expected.shift(), paths);
        equals(0, expected.length);

        done();
/**/
    }, 12);
});
