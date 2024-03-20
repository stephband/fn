
/**
setPath(path, object, value)
Sets `value` at `path` in `object`, where path exists.
*/

import curry from './curry.js';

export function setPath(path, object, value) {
    const key = path.replace(/([^.]+)\./g, ($0, $1) => {
        object = object[$1];
        return '';
    });

    return object[key] = value;
}

export default curry(setPath, true);
