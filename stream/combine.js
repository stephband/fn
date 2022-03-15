

import Combine from './stream.js';

export default function combine() {
    console.warn('combine() deprecated in favour of Stream.combine()');
    return Combine(arguments);
}

console.warn('combine() deprecated in favour of Stream.combine()');
