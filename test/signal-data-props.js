
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';


// Note: reading a frozen (non-writable, non-configurable) *own* data property
// through a Data proxy throws the Proxy get-invariant, by design — we let it
// fail so it's obvious such a property cannot be observed. Only the inherited
// case (below) is safe, because the invariant applies only to own properties.

Deno.test('Data.of() inherited frozen property', function() {
    const proto = Object.defineProperty({}, 'c', {
        value: { x: 1 }, writable: false, configurable: false, enumerable: true
    });
    const data = Data.of(Object.create(proto));

    // Inherited → not the target's own property → invariant does not apply →
    // returning a proxy is legal, must not throw
    equals(data.c.x, 1);
});

Deno.test('Data(object, { enumerables: true })', function() {
    const object = Object.defineProperty({}, 'hidden', {
        value: 1, writable: true, enumerable: false, configurable: true
    });
    const data = Data(object, { enumerables: true });

    const s = Signal.from(() => data.hidden);
    equals(s.value, 1);
    data.hidden = 2;         // observable write, but property is non-enumerable
    equals(s.value, 1);      // not observed under enumerables:true → stale
});

Deno.test('Data(object, { functions: false })', function() {
    let runs = 0;
    const data = Data({ fn: function a() {} }, { functions: false });

    const s = Signal.from(() => { runs++; return data.fn; });
    s.value;                 // evaluate, runs = 1
    data.fn = function b() {};
    s.value;                 // function not observed → no re-run
    equals(runs, 1);
});

class Thing {
    constructor(n)  { this.prop = n; }
    get accessor()  { return this.prop; }
    set accessor(n) { this.prop = n; }
}

Data.define(Thing, {
    computed: ['accessor']
});

Deno.test('Signal.from(() => data.computedeAccessor)', function() {
    const data = Data.of(new Thing(60));
    const s    = Signal.from(() => data.accessor);

    equals(s.value, 60);
    data.accessor = 61;
    equals(s.value, 61);
    data.prop = 62;
    equals(s.value, 62);
});
