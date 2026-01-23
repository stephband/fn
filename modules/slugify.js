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
        // Remove characters that are genuinely problematic in URLs
        .replace(/[\/\?#\[\]@!$&'()*+,;=\\]/g, '')
        // Replace whitespace and remaining punctuation with hyphens
        .replace(/[\s\._]+/g, '-')
        // Strip hyphens from start/end
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
