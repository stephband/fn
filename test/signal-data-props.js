
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data, { $trap } from '../modules/data.js';


// Note: reading a frozen (non-writable, non-configurable) *own* data property
// through a Data proxy throws the Proxy get-invariant, by design — we let it
// fail so it's obvious such a property cannot be observed. Only the inherited
// case (below) is safe, because the invariant applies only to own properties.

Deno.test('Data.of() inherited frozen property', function() {
    const proto = Object.defineProperty({}, 'c', {
        value: { x: 1 },
        enumerable: true
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

Deno.test('Data(object, { computed: [...] })', function() {
    class Thing {
        constructor(n)  { this.property = n; }
        get accessor()  { return this.property; }
        set accessor(n) { this.property = n; }
    }

    Data.define(Thing, {
        computed: ['accessor']
    });

    const data    = Data.of(new Thing(0));
    const p       = Signal.from(() => data.property);
    const a       = Signal.from(() => data.accessor);
    const signals = data[$trap].signals;

    // Create a signal for data.property by getting it
    equals(p.value, 0);
    // No data signal has been created for data.accessor yet, but setting
    // accessor should nonetheless invalidate the p signal
    data.accessor = 1
    equals(p.value, 1);
    // Create a signal for data.accessor by getting it
    equals(a.value, 1);
    data.accessor = 2;
    equals(p.value, 2);
    equals(a.value, 2);
    data.property = 3;
    equals(p.value, 3);
    equals(a.value, 3);

    // Property and accessor should have signals
    assert(signals.property);
    assert(signals.accessor);
});

Deno.test('Data(object, { enumerables: true, computed: [...] })', () => {
    class Thing {
        constructor(n)  { this.property = n; }
        get accessor()  { return this.property; }
        set accessor(n) { this.property = n; }
    }

    Data.define(Thing, {
        enumerables: true,
        computed: ['accessor']
    });

    const data    = Data.of(new Thing(0));
    const p       = Signal.from(() => data.property);
    const a       = Signal.from(() => data.accessor);
    const signals = data[$trap].signals;

    // Create a signal for data.property by getting it because it is enumerable
    equals(p.value, 0);
    // Setting accessor should invalidate the p signal
    data.accessor = 1
    equals(p.value, 1);
    // No signal is created for accessor because it is not enumerable
    equals(a.value, 1);
    data.accessor = 2;
    equals(p.value, 2);
    equals(a.value, 2);
    data.property = 3;
    equals(p.value, 3);
    equals(a.value, 3);

    // Property should have a signal, accessor should not
    assert(signals.property);
    assert(!signals.accessor);
});
