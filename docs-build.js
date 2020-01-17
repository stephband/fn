/*

Runs Prism on document.
Runs Sparky on the document.
Removes build-fn attributes.
Removes nodes with build-remove attribute.

*/

// Syntax highlighter
// https://prismjs.com/
//
// Runs automatically on <code class="language-xxx"> elements
import './libs/prism/prism.js';


import { invoke, nothing, requestTick } from './module.js';
import { query } from '../dom/module.js';
import './docs.js';
import Sparky, { config } from '../sparky/module.js';

// Change name of attributes
config.attributeFn      = 'build-fn';
config.attributeInclude = 'build-src';
config.attributePrefix  = 'build-';

setTimeout(function() {
    query('[build-fn]', document).forEach(invoke('removeAttribute', ['build-fn']));
    query('[build-remove]', document).forEach(invoke('remove', nothing));
    console.log('Document built! (this is just a cheap timeout, it may not be true)');
}, 5000);

// Run Sparky on the whoooole document
requestTick(function() {
    console.log('Build...');
    Sparky(document.documentElement).push({});
});
