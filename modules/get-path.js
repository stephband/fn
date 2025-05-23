
/**
getPath(path, object)

Returns the value at `path` in `object`.

```
const value = getPath('path.to.value', object);
```
*/

const rpath = /\.?([\w-]+)/g;

function getRegexPathThing(regex, path, object) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('getPath(path, object): invalid path "' + path + '" at "' + path.slice(regex.lastIndex) + '"');
    }

    return getRegexPath(regex, path, object[tokens[1]]);
}

function getRegexPath(regex, path, object) {
        // At the end of a path return what we've got there
    return regex.lastIndex === path.length ? object :
        // Otherwise where object is falsey further drilldown is not possible
        !object ? undefined :
        // Otherwise drill down
        getRegexPathThing(regex, path, object) ;
}

export default function getPath(path, object) {
    rpath.lastIndex = 0;
    // Accept numbers or strings as path
    return getRegexPath(rpath, '' + path, object) ;
}
