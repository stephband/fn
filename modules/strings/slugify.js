export default function slugify(string) {
    if (typeof string !== 'string') { return; }
    return string.trim().toLowerCase().replace(/[\W_]/g, '-');
};
