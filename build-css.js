
/*
Build CSS from the array of files in JSON style array.

> node build-css.js source.json target.css
*/

// Log colours
const cyan    = "\x1b[36m%s\x1b[0m";

// Arguments
const args     = process.argv.slice(2);

if (args.length < 2) {
    throw new Error("build-css requires the arguments: source.json target.css");
}

const source  = args[0].replace(/^\.\//, '');
const target  = args[1] || 'style.min.css';

// Get style property of source JSON
const CleanCSS = require('clean-css');
const fs       = require('fs');

function logError(error) {
    if (error) { throw error; }
}

// Minify the files
const output = new CleanCSS({
    inline: ['all']
}).minify([source]);

fs.writeFile(target, output.styles, logError);

console.log(cyan, 'CSS ' + source + ' ('
    + (output.stats.originalSize / 1000).toFixed(1) + 'kB) minified to '
    + target + ' (' + (output.stats.minifiedSize / 1000).toFixed(1) + 'kB) in '
    + output.stats.timeSpent + 'ms'
);
