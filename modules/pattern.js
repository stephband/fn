
/**
pattern(toString, routes)

Accepts a function and an object of functions keyed by regexp patterns, and
returns a function that takes a string and tests the regexes against it until
a match is found. The function for that match is called with the remainder of
the path string plus the contents of any captured groups.

```js
location.on(pattern(get('path'), {
    '^path\/to\/([a-z])\/([0-9])\/': function(data, path, $1, $2) {
        // Set up view

        return function teardown() {
            // Teardown view
        };
    }
}));
```
**/

export default function pattern(toString, patterns) {
    const regexps = Object.keys(patterns).map((pattern) => RegExp(pattern));
    return function route(data) {
        const path = toString.apply(this, arguments);
        if (!path) { return; }
        var n = -1, regexp, captures;
        while(regexp = regexps[++n]) {
            captures = regexp.exec(path);
            if (captures) {
                captures[0] = path.slice(captures.index + captures[0].length);
                console.log(regexp.source.replace('\\/', '/'), patterns)
                return patterns[regexp.source.replace('\\/', '/')].call(this, data, captures);
            }
        }
    };
}
