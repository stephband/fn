
/**
pattern(stringify, routes)

Accepts a function and an object of functions keyed by regexp patterns, and
returns a function that takes a string and tests the regexes against it until
a match is found. The function for that match is called with the remainder of
the path string plus the contents of any captured groups.

```js
const route = pattern(get('path'), {
    '^path\/to\/([a-z])\/([0-9])\/': function(data, $1, $2) {
        // Set up view
    }
});
```
**/

export default function pattern(stringify, patterns) {
    const keys = Object.keys(patterns);
    const regexps = keys.map((pattern) => RegExp(pattern));
    return function route(data) {
        const path = stringify.apply(this, arguments);
        if (!path) { return; }
        var n = -1, regexp, captures;
        while(regexp = regexps[++n]) {
            captures = regexp.exec(path);
            if (captures) {
                let m = 0;
                while(captures[++m]) {
                    arguments[arguments.length] = captures[m];
                    arguments.length += 1;
                }
                return patterns[keys[n]].apply(this, arguments);
            }
        }
        if (patterns.default) {
            patterns.default.apply(this, arguments);
        }
    };
}
