export default function truncate(n, string) {
    return string.length <= n ?
        string :
        string.slice(0, n) + '…' ;
}
