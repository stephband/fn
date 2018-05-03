
export default function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key] === null ?
        undefined :
        object[key] ;
}
