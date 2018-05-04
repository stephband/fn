export default function toPlainText(string) {
    return string
    // Decompose string to normalized version
    .normalize('NFD')
    // Remove accents
    .replace(/[\u0300-\u036f]/g, '');
};
