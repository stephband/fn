
// markdown library
// https://marked.js.org/#/README.md#README.md
import './libs/marked/marked.min.js';

// Syntax highlighter
// https://prismjs.com/
import './libs/prism/prism.js';

import { cache, concat, capture, id, invoke, last, nothing, slugify, Fn, Stream } from './module.js';
import { fragmentFromHTML } from '../dom/module.js';
import { functions } from '../sparky/module.js';

const A = Array.prototype;

const fetchOptions = {
    method: 'GET'
};

const markedOptions = {
    // GitHub Flavored Markdown
    gfm: true,

    // Highlight code blocks
    highlight: function(code, lang, callback) {
        return Prism.highlight(code, Prism.languages[lang || 'js'], lang || 'js');
    },

    // Emit self-closing tags
    xhtml: true,

    // Typographic niceties
    smartypants: true
};

// Open comment followed by spaces and (dot)(name) (brackets) OR (tag)
const parseDoc = window.parseDoc = capture(/\/\*\s*(?:(\.)?([\w]+)(\([^\)]*\))|(<[\w-]+>))/, {
    2: function(data, results) {
        data.push({
            id:     slugify(results[2] + results[3]),
            prefix: results[1],
            name:   results[2],
            params: results[3],
            title:  Prism.highlight((results[1] || '') + results[2] + results[3], Prism.languages['js'], 'js')
        });
        return data;
    },

    4: function(data, results) {
        data.push({
            id:     slugify(results[4]),
            prefix: '',
            name:   results[4],
            params: '',
            title:  Prism.highlight(results[4], Prism.languages['html'], 'html')
        });
        return data;
    },

    // Markdown    (anything) close comment
    close: capture(/^\s*([\s\S]*?)\*\//, {
        1: function(data, results) {
            last(data).body = marked(results[1], markedOptions);
            return data;
        },

        close: function(data, results) {
            return parseDoc(data, results);
        }
    }),

    // If there are no comments return data
    catch: id
});

const fetchDocs = cache(function(path) {
    return fetch(path, fetchOptions)
    .then(invoke('text', nothing))
    .then(parseDoc([]));
});

function flatten(acc, array) {
    acc.push.apply(acc, array);
    return acc;
}

function toHTML(paths) {
    return Promise.all(paths.map(function(url) {
        const parts = url.split(/\?/);
        const path  = parts[0];
        const ids   = parts[1] && parts[1].split(/\s*,\s*/);

        return ids ?
            fetchDocs(path)
            .then(function(docs) {
                //console.log(path, ids.join(', '), docs)
                // Gaurantee order of ids
                return ids.map(function(id) {
                    return docs.filter(function(doc) {
                        return doc.name === id;
                    });
                })
                .reduce(flatten, []);
            }) :
            fetchDocs(path) ;
    }))
    .then(function(array) {
        // Flatten
        return A.concat.apply([], array);
    });
}

functions.docs = function(node, input, params) {
    const data = toHTML(params);
    const output = Stream.of();
    data.then(output.push);
    return output;
};

functions.append = function(node, input, params) {
    const name = params[0];
    return input.tap((scope) => {
        const fragment = fragmentFromHTML(scope[name]);
        node.appendChild(fragment);
    });
};
