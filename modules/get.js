
/*
get(name, object)
Get property `name` of `object`.
*/

import curry from './curry.js';

export function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];
}

export default curry(get, true);
