
import {
    assert,
    assertEquals as equals,
    assertStrictEquals as is,
    assertObjectMatch as matches
} from 'jsr:@std/assert@1';

import Signal from '../modules/signal.js';
import Data   from '../modules/data.js';


Deno.test('Data.of([]).push()', function() {
    const array  = Data.of(['a']);
    const length = Signal.from(() => array.length);

    equals(length.value, 1);
    array.push('b');
    equals(length.value, 2);
});

Deno.test('Data.of([])[n] = value', function() {
    const array  = Data.of(['a']);
    const length = Signal.from(() => array.length);

    equals(length.value, 1);
    array[3] = 'd';
    equals(length.value, 4);
});

Deno.test('Data.of([]).splice()', function() {
    const array = Data.of(['a', 'b']);
    const first = Signal.from(() => array[0]);

    equals(first.value, 'a');
    array.splice(0, 1);          // shift 'b' into index 0
    equals(first.value, 'b');
});

Deno.test('Data.of([]).length = 0', function() {
    const array = Data.of([{ id: 'a' }, { id: 'b' }]);
    const first = Signal.from(() => array[0] && array[0].id);

    equals(first.value, 'a');
    array.length = 0;
    // Truncation must invalidate index 0, or first.value returns the stale 'a'
    equals(first.value, undefined);
});

Deno.test('Data.of([]).length = 2', function() {
    const array = Data.of(['a', 'b', 'c', 'd']);
    const s1 = Signal.from(() => array[1]);
    const s3 = Signal.from(() => array[3]);

    equals(s1.value, 'b');
    equals(s3.value, 'd');

    array.length = 2;            // drops indexes 2 and 3

    equals(s3.value, undefined); // dropped → invalidated
    equals(s1.value, 'b');       // kept → unchanged
    equals(array.length, 2);
});

Deno.test('Signal.from(() => selection[0])', function() {
    const selection = Data.of([{ id: 'a' }, { id: 'b' }]);

    // Reads index 0 then length, exactly as the selection panel does
    const label = Signal.from(() => {
        const first = selection[0];
        return first ?
            (selection.length === 1 ? first.id : 'Multiple') :
            'hidden' ;
    });

    equals(label.value, 'Multiple');
    selection.length = 0;
    equals(label.value, 'hidden');
});
