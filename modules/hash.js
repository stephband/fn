/** hash(string)

Returns a hash code for a string.

The hash code for a string object is computed as
`string[0]*31^(n-1) + string[1]*31^(n-2) + ... + s[n-1]` using number
arithmetic, where n is the length of the string. The hash value of the
empty string is zero.
**/

const reducer = (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0;

export default function hash(string) {
    return [...string].reduce(reducer, 0);
}
