
/**
toCamelCase(string)
Capitalises any Letter following a `'-'` and removes the dash.
**/

export default function toDashCase(string) {
    return string
    // Take any capital letter preceded or followed by a non-capital and insert
    // a dash in front of it
    .replace(/([^A-Z])([A-Z])|(.)([A-Z][a-z])/g, ($0, $1, $2, $3, $4) => $1 ?
        $1 + '-' + $2.toLowerCase() :
        $3 + '-' + $4.toLowerCase()
    )
    .toLowerCase();
}
