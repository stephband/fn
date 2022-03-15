
/*
merge(source1, source2, ...)
Merges multiple sources into a hot stream.
*/

import Merge from './stream.js';

export default function merge() {
    console.warn('merge() deprecated in favour of Stream.merge()');
    return Merge(arguments);
}

console.warn('merge() deprecated in favour of Stream.merge()');
