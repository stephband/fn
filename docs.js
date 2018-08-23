
// markdown library
// https://marked.js.org/#/README.md#README.md
import 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

// Syntax highlighter
//
import '../prism/prism.js';

import { cache, concat, exec, id, invoke, last, nothing, Functor as Fn, Stream } from '../fn/fn.js';
import Sparky from '../sparky/sparky.js';

const A = Array.prototype;

const fetchOptions = {
    method: 'GET'
};

const markdownOptions = {
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

const parseDoc = exec(/\/\*\s*/, {
    0: exec(/^(\.)?([\w]+)(\([^\)]*\))/, {
        0: function(data, results) {
            data.push({
                prefix: results[1],
                name:   results[2],
                params: results[3],
                title:  Prism.highlight(results[0], Prism.languages['js'], 'js')
            });
            return data;
        },

        end: exec(/^\s*([\s\S]*?)\*\//, {
            1: function(data, results) {
                last(data).body = marked(results[1], markdownOptions);
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
                    return docs.find(function(doc) {
                        return doc.name === id;
                    });
                });
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
