
/**
toPlainText(string)
Normalises string as plain text without accents using canonical decomposition
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize).
**/

export default function toPlainText(string) {
    return string
    // Decompose string to normalized version
    .normalize('NFD')
    // Remove accents
    .replace(/[\u0300-\u036f]/g, '');
}
