
/*
Build HTML from a template.

> node build-html.js source.html target.html [time]
*/

// Log colours
const cyan    = "\x1b[36m%s\x1b[0m";

// Arguments
const args   = process.argv.slice(2);

if (args.length < 2) {
    throw new Error("build-html requires the arguments: source.html target.html [time]");
}

// Lop of any leading './' on source name
const source = args[0].replace(/^\.\//, '');
const target = args[1];
const time   = args[2] || 4;

// Import
const nodestatic = require("node-static");
const puppeteer  = require("puppeteer");
const http       = require('http');
const fs         = require("fs");

// Start serving static files from ../ on port :8080
const server = new nodestatic.Server('../');
const port   = 8080;
const root   = 'http://127.0.0.1:' + port + '/';

http.createServer(function(request, response) {
    request.addListener('end', function() {
        server.serve(request, response);
        console.log(response.statusCode, request.url);
    }).resume();
}).listen(port);

// Get the name of the current working directory
const path = process.cwd().split('/');
const dir  = path[path.length - 1] + '/';

// Build HTML inside headless Chrome
async function build(url, target, time) {
    // Launch headless Chrome
    const browser = await puppeteer.launch({ headless: true });
    const page    = await browser.newPage();

    // Navigate to source
    console.log(cyan, 'Serving', url);
    await page.goto(url);

    setTimeout(async function() {
        // Read HTML
        const html = await page.evaluate(() => {
            return "<!DOCTYPE html>" + document.documentElement.outerHTML;
        });

        // Write HTML to target file and exit process
        const filesize = Math.round(Buffer.byteLength(html, 'utf8') / 1000);
        fs.writeFile(target, html, function(err) {
            if (err) { throw err; }
            console.log(cyan, 'Wrote', target + ' (' + filesize + 'kB)');
            process.exit(0);
        });
    }, parseFloat(time) * 1000);
}

build(root + dir + source, target, time);
