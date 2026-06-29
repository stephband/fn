/**
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

```js
slugify('Party on #mydudes!') // 'party-on-mydudes'
```
**/

export default function slugify(string) {
    // Accept a number or string
    if (typeof string === 'number') string = string + '';
    if (typeof string !== 'string') return;

    return string
        .trim()
        .toLowerCase()
        // Normalize unicode (NFKC)
        .normalize('NFKC')
        // Replace any run of punctuation, symbols or whitespace with a hyphen.
        // \p{P} punctuation, \p{S} symbols, \p{Z} unicode separators (spaces),
        // \s catches ASCII whitespace (tab, newline) that \p{Z} misses.
        .replace(/[\p{P}\p{S}\p{Z}\s]+/gu, '-')
        // Strip hyphens from start/end
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
