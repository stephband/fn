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
import { select } from '../dom/module.js';
import './docs.js';
import Sparky, { config } from '../sparky/module.js';

// Change name of attributes
config.attributeFn      = 'build-fn';
config.attributeSrc     = 'build-src';
config.attributePrefix  = 'build-';

setTimeout(function() {
    select('[build-fn]', document).forEach(invoke('removeAttribute', ['build-fn']));
    select('[build-remove]', document).forEach(invoke('remove', nothing));
    // Brave inserts some detection script
    // select('[data-dapp-detection]', document).forEach(invoke('remove', nothing));
    window.console.log('Document built! (this is just a cheap timeout, it may not be true)');
}, 3000);

// Run Sparky on the whoooole document
requestTick(function() {
    window.console.log('Build...');
    Sparky(document.documentElement).push({});
});
