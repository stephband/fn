
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';

Deno.test('TickSignal.tail is managed properly', async function() {
    const sa = Signal.of(0);
    const sb = Signal.of(0);
    const sc = Signal.of(0);
    let cRuns = 0;

    const a = Signal.tick(() => { sa.value; });
    const b = Signal.tick(() => { sb.value; });

    sa.value = 1;
    sb.value = 1;

    b.stop();

    const c = Signal.tick(() => { sc.value; cRuns++; });
    sc.value = 1;

    await new Promise((resolve) => setTimeout(resolve, 0));

    equals(cRuns, 2);
});
