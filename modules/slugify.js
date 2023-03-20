/**
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

```js
    slugify('Party on #mydudes!') // 'party-on-mydudes'
```
**/

export default function slugify(string) {
    // Accept a number or string
    string = typeof string === 'number' ?
        string + '' : 
        string.trim() ;

    if (typeof string !== 'string') { return; }

    return string
    .toLowerCase()
    .replace(/^[\W_]+/, '')
    .replace(/[\W_]+$/, '')
    .replace(/[\W_]+/g, '-');
}
