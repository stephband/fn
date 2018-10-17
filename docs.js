
// markdown library
// https://marked.js.org/#/README.md#README.md
import './libs/marked/marked.min.js';

// Syntax highlighter
// https://prismjs.com/
import './libs/prism/prism.js';

import { cache, concat, exec, id, invoke, last, nothing, slugify, Fn, Stream } from '../fn/fn.js';
import Sparky from '../sparky/sparky.js';

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

// Open comment followed by spaces
const parseDoc = exec(/\/\*\s*/, {
    // Name   (dot)(name) (brackets) OR (tag)
    0: exec(/^(\.)?([\w]+)(\([^\)]*\))|^(<[\w-]+>)/, {
        2: function(data, results) {
            data.push({
                id:     slugify(results[2] + results[3]),
                prefix: results[1],
                name:   results[2],
                params: results[3],
                title:  Prism.highlight(results[0], Prism.languages['js'], 'js')
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
        end: exec(/^\s*([\s\S]*?)\*\//, {
            1: function(data, results) {
                last(data).body = marked(results[1], markedOptions);
                return data;
            },

            end: function(data, results) {
                return parseDoc(data, results);
            }
        })
    })
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

Sparky.fn.docs = function(node, input, params) {
    const data = toHTML(params);
    const output = Stream.of();
    data.then(output.push);
    return output;
};
