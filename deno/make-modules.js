
// Run this file with:
// deno run --allow-read --allow-env --allow-net --allow-write --allow-run ./build-modules.js outfile infile
// or
// deno run --allow-read --allow-env --allow-net --allow-write --allow-run ./build-modules.js outdir infile1 infile2 ...

// Find latest version here:
// https://deno.land/x/esbuild
import * as es from 'https://deno.land/x/esbuild@v0.12.28/mod.js'

// Arguments
const args    = Deno.args;

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

Deno
.readTextFile(workingdir + 'package.json')
.then(JSON.parse)

// Build modules
.then((pkg) => es.build({
    // A string to prepend to modules and chunks
    banner: {
        js: '// ' + pkg.title + ' ' + pkg.version + ' (Built ' + getDateTime() + ')\n\n' + '',
        css: '// ' + pkg.title + ' ' + pkg.version + ' (Built ' + getDateTime() + ')\n\n' + ''
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
    //target:    ['es2016'],

    minify:    true,
    bundle:    true,
    format:    'esm',
    logLevel:  'info'
}))

// Explicitly stop esbuild
.then((d) => {
    es.stop();
})

// Error
.catch((e) => {
    console.error(e);
    Deno.exit(1)
});
