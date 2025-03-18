
/**
setPath(path, object, value)
Sets `value` at `path` in `object`, where path exists.
*/

function get(object, name) {
    return object[name];
}

export default function setPath(path, object, value) {
    const names = path.split(/\s*\.\s*/);
    const key   = names.pop();
    object = names.reduce(get, object);
    return object[key] = value;
}
