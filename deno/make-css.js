
// Run this file with:
// deno run --allow-read --allow-env --allow-net --allow-write --allow-run ./build-modules.js outfile infile
// or
// deno run --allow-read --allow-env --allow-net --allow-write --allow-run ./build-modules.js outdir infile1 infile2 ...

import './deno-2-support.js';
import postpad from '../modules/postpad.js';

// Find latest version here:
// https://deno.land/x/esbuild
//import * as es from 'https://deno.land/x/esbuild@v0.12.28/mod.js';
import * as es from 'https://deno.land/x/esbuild@v0.23.0/mod.js';
//import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.10.3";


// Arguments - slice args to get a muteable array
const args  = Deno.args.slice();

// Extract flags
const flags = {
    sourcemaps: true
};

while (/^--/.test(args[0])) {
    const flag = args.shift().slice(2);
    flags[flag] = true;
}

// First argument is name of output file (if it has a file extension), otherwise
// name of output directory
const outfile = /\.\w+$/.test(args[0]) ? args[0] : undefined ;
const outdir  = /\.\w+$/.test(args[0]) ? undefined : args[0] ;

// Next arguments are names of entry points. If output argument was name of file
// there can only be one entry point
const modules = args.slice(1) || '';

// Directories
const workingdir = Deno.cwd() + '/';
const moduledir  = new URL('.', import.meta.url).pathname;

// Console colours
const dim       = "\x1b[2m%s\x1b[0m";
const white     = "\x1b[37m%s\x1b[0m";
const red       = "\x1b[31m%s\x1b[0m";
const green     = "\x1b[32m%s\x1b[0m";
const yellow    = "\x1b[33m%s\x1b[0m";


function getDateTime() {
    return (new Date())
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
}

function getHeader(pkg, indent) {
    return (pkg.title ? pkg.title + ' ' : '')
    + (pkg.version ? '\n' + indent + pkg.version : '')
    + (pkg.author ? '\n' + indent + 'By ' + (pkg.author.name ? pkg.author.name : pkg.author) : '');
    //+ '\n' + indent + 'Built ' + getDateTime();
}

Deno
.readTextFile(workingdir + 'package.json')
.then(JSON.parse)

// If there is no package.json leave build untitled
.catch(() => ({
    title: '',
    version: ''
}))

// Build modules
.then((pkg) => es.build({
    // A string to prepend to modules and chunks
    banner: {
        js:   '/* ' + getHeader(pkg, '   ') + ' */\n',
        css:  '/* ' + getHeader(pkg, '   ') + ' */\n'
    },

    // Disable ASCII character escaping
    charset:   'utf8',

    // Modules become entry points
    entryPoints: modules,

    // and are built into outdir along with shared chunks, or into outfile
    outdir:    outdir,
    outfile:   outfile,

    // Code splitting requires outdir, not outfile
    splitting: !!outdir,

    // Specify which environments to support
    // https://esbuild.github.io/content-types/
    target:    [
        'edge109',
        'firefox109',
        'chrome109',
        'safari16'
    ],

    // Yeah, I suppose we oughtta have sourcemaps so we can debug the bugs
    sourcemap: flags.sourcemaps,

    minify:    true,
    bundle:    true,
    write:     true,
    format:    'esm',
    logLevel:  'info',

    plugins: [{
        // Rewrite relative URLs for font files
        name: 'fonts',
        setup: (build) => build.onResolve({
            filter: /^\..+\.(?:woff|woff2|eot|ttf|otf)(?:#|$)/
        }, (args) => {
            console.warn('Relative font import', args.path);
            return { path: '../' + args.path, external: true };
        })
    }, {
        // Mark .png, .svg and so on as external files to avoid them being
        // bundled. Ideally, we want to rewrite their paths here. TODO!
        name: 'external',
        setup: (build) => build.onResolve({
            filter: /\.(?:png|jpg|svg|woff|woff2|eot|ttf|otf)(?:#|$)/
        }, (args) => {
            console.warn('URL not rewritten:', args.path);
            return { path: args.path, external: true };
        })
    }],

    loader: {
        // These have been marked as external in the plugin above, so this does
        // nothing. I leave it here for indication how to bundle url(image)
        // stuff with a 'file' loader should you need to.
        '.eot':   'file',
        '.woff':  'file',
        '.woff2': 'file',
        '.svg':   'file',
        '.ttf':   'file',
        '.otf':   'file',
        '.png':   'file',
        '.jpg':   'file'
    },

    // Generate data about build
    metafile: true
}))

// In docs but doesnt exist
//.then((result) => es.analyzeMetafile(result.metafile))

.then((result) => {
    const paths = Object
    .values(result.metafile.inputs)
    .flatMap((input) =>
        input.imports.map((imported) => imported.path)
    )
    .reduce((paths, path) => {
        if (path.endsWith('.js')) {
            if (path.startsWith('../')) {
                !paths['../js'].includes(path) && paths['../js'].push(path);
            }
            else {
                !paths['./js'].includes(path) && paths['./js'].push(path);
            }
        }
        else {
            if (path.startsWith('../')) {
                !paths['../css'].includes(path) && paths['../css'].push(path);
            }
            else {
                !paths['./css'].includes(path) && paths['./css'].push(path);
            }
        }

        return paths;
    }, { './js': [], '../js': [], './css': [], '../css': [] });

    paths['../js'].sort();
    paths['./js'].sort();
    paths['../css'].sort();
    paths['./css'].sort();

    const colWidth = 4 + Math.min(60, Math.max(
        /*paths['./js']
        .reduce((l, path) => path.length > l ? path.length : l, 0),*/
        paths['./css']
        .reduce((l, path) => path.length > l ? path.length : l, 0)
    ));

    //const jslength = Math.max(paths['../js'].length, paths['./js'].length);
    const csslength = Math.max(paths['../css'].length, paths['./css'].length);

    /*
    while (paths['../js'].length < jslength) {
        paths['../js'].push('');
    }

    while (paths['./js'].length < jslength) {
        paths['./js'].push('');
    }
    */

    while (paths['../css'].length < csslength) {
        paths['../css'].push('');
    }

    while (paths['./css'].length < csslength) {
        paths['./css'].push('');
    }

    /*
    console.log('\n  ' + postpad(' ', colWidth, 'Project modules') + postpad(' ', colWidth, 'Local modules') + '\n');

    console.log(green, '  ' +
        paths['./js']
        .map(postpad(' ', colWidth))
        .map((path, i) => path + paths['../js'][i])
        .join('\n  ')
    );
    */

    console.log('\n  ' + postpad(' ', colWidth, 'Project CSS') + postpad(' ', colWidth, 'Local CSS') + '\n');

    console.log(green, '  ' +
        paths['./css']
        .map(postpad(' ', colWidth))
        .map((path, i) => path + paths['../css'][i])
        .join('\n  ') +
        '\n'
    );

    // Explicitly stop esbuild
    es.stop();
})

// Error
.catch((e) => {
    console.error(e);
    Deno.exit(1)
});
