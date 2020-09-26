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

import { invoke, nothing } from './module.js';
import { select } from '../dom/module.js';
import './docs.js';
import Sparky from '../sparky/module.js';

setTimeout(function() {
    select('[fn]', document).forEach(invoke('removeAttribute', ['fn']));
    select('[remove]', document).forEach(invoke('remove', nothing));
    window.console.log('Document built! (this is just a cheap timeout, it may not be true)');
}, 3000);
