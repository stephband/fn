
/**
toCamelCase(string)
Capitalises any Letter following a `'-'` and removes the dash.
**/

export default function toCamelCase(string) {
    // Be gracious in what we accept as input
    return string.replace(/-(\w)?/g, function($0, letter) {
        return letter ? letter.toUpperCase() : '';
    });
}
