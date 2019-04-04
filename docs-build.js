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
import { query } from '../dom/module.js';
import './docs.js';
import Sparky from '../sparky/module.js';

// Change name of attributes
Sparky.attributeFn     = 'template-fn';
Sparky.attributePrefix = 'sparky-';

Sparky(document);

setTimeout(function() {
    query('[template-fn]', document).forEach(invoke('removeAttribute', ['template-fn']));
    query('[remove-template]', document).forEach(invoke('remove', nothing));
    console.log('Document built! (this is just a cheap timeout, it may not be true)');
}, 5000);
