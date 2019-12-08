
/*
get(name, object)
Get property `name` of `object`.
*/

export default function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];

    // Why are we protecting against null again? To innoculate ourselves
    // against DOM nodes?
    //return value === null ? undefined : value ;
}
