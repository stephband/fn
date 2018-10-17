// Build the document

// Preprocess
import '../prism/prism.js';
import '../sparky/libs/prism/prism.sparky.js';
import { Fn, compose, each, get, is, overload, parse } from '../fn/fn.js';
import { parseParams } from '../sparky/js/parse.js';
import Sparky from '../sparky/sparky.js';
import { attribute, before, clone, create, fragmentFromTemplate, get as getById, query, remove } from '../dom/dom.js';

window.Sparky = Sparky;

const attributeType = attribute('type');
const htmlTemplate  = getById('html-code', document).content;
const jsTemplate    = getById('js-code', document).content;
const cssTemplate   = getById('css-code', document).content;

//                             Section   dot  name   params
var parseDataModule = parse(/^([^\s]*)\s+(\.)?([\w]+)(\()\s*/, {
    1: function(data, value) {
        data.section = value;
        return data;
    },

    2: function(data, value) {
        data.prefix = value;
        return data;
    },

    3: function(data, value, results) {
        data.name = results[2] ?
            results[2] + value :
            value ;
        return data;
    },

    4: function(data, value, results) {
        if (results.input[results[0].length + results.index] === ')') {
            data.params = [];
            results.index++;
            return data;
        }

        data.params = parseParams([], results);
        return data;
    }
});

window.p = parseDataModule;

var modules = window.modules = query('[data-module]', document)
.map(function(template) {
    //var params   = parseParams([], attribute('data-module', template));
    //var params = /^([^\s]*)\s+([\w]+)\(([^)])\)/.exec(attribute('data-module', template));
    var data      = parseDataModule({}, attribute('data-module', template));
    data.fragment = fragmentFromTemplate(template);

    remove(template);
    return data;
});

function formatCode(code) {
    var indent = (/\s*\n([ \t]*)/.exec(code) || [])[1];

    return code
    // Remove leading space and lines
    .replace(/\s*\n[ \t]*/, '')
    // Remove indentation
    .replace(RegExp('\n' + indent, 'g'), '\n')
    // Remove trailing space and lines
    .replace(/\s*\n[ \t]*$/, '');
}

modules.forEach(function(data) {
    query('[type]', data.fragment)
    .forEach(overload(attributeType, {
        'text/html': function(node) {
            var html     = node.innerHTML;
            var highlighted = Prism.highlight(formatCode(html), Prism.languages.sparky);
            var code     = Sparky(clone(htmlTemplate), highlighted);
            var fragment = create('fragment', html);
            before(node, code[0]);
            before(node, fragment);
            remove(node);
        },

        'text/js': function(node) {
            var html     = node.innerHTML;
            var code     = Sparky(clone(jsTemplate), Prism.highlight(formatCode(html), Prism.languages.js));
            before(node, code[0]);
            remove(node);
        },

        'text/css': function(node) {
            var html     = node.innerHTML;
            var code     = Sparky(clone(cssTemplate), Prism.highlight(formatCode(html), Prism.languages.css));
            before(node, code[0]);
            remove(node);
        }
    }));
});

Sparky.fn.modules = function(node, scopes, params) {
    const section = params[0];
    return Fn.of(modules.filter(compose(is(section), get('section'))));
};

Sparky(document.documentElement);

// Cleanup. Remove things we don't want in the final document
query('.remove, [data-module]', document).forEach(remove);









// -----

// Parse comments in files

axios
.get('css/editor.css')
.then(fn.get('data'))
.then(function(text) {
    var array = [];
    text.replace(/\/\*([^\*]+)\*\//g, function($0, $1) {
        array.push($1); return '';
    }); return array;
});
