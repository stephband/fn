/*

Runs Prism on document.
Runs Sparky on the document.
Removes template-fn attributes.
Removes nodes with remove-template attribute.

*/

// Syntax highlighter
// https://prismjs.com/
//
// Runs automatically on <code class="language-xxx"> elements
import './libs/prism/prism.js';


import { invoke, nothing } from './module.js';
import { create, query } from '../dom/module.js';
import './docs.js';
import { config } from '../sparky/module.js';

// Change name of attributes
config.attributeFn      = 'build-fn';
config.attributeInclude = 'build-include';
config.attributePrefix  = 'build-';

setTimeout(function() {
    query('[build-fn]', document).forEach(invoke('removeAttribute', ['build-fn']));
    query('[build-remove]', document).forEach(invoke('remove', nothing));
    console.log('Document built! (this is just a cheap timeout, it may not be true)');
}, 5000);
