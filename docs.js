
// markdown library
// https://marked.js.org/#/README.md#README.md
import './libs/marked/marked.min.js';

// Syntax highlighter
// https://prismjs.com/
import './libs/prism/prism.js';

import { cache, capture, id, invoke, last, nothing, slugify, Stream } from './module.js';
import { fragmentFromHTML } from '../dom/module.js';
import { register } from '../sparky/module.js';

const Prism = window.Prism;
const marked = window.marked;
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

//                Open comment followed by spaces and (dot)(name)   ((params))   or (:params)          or (="")            OR (<tag>)               OR ({[ tag ]} or {% tag %})
const parseDoc = window.parseDoc = capture(/\/\*\s*(?:(\.)?([\w-, .]+)(?:(\([^)]*\))|:[ \t]*([\w-, .:'"]*)|="([\w-#,/%\]}[{ .:']*)")?|(<[\w- ="]+\/?>)|(\{[\[\]\w%|:. ]+\}))/, {
    // .property or title or {[tag]}
    2: function(data, results) {
        data.push({
            id:     slugify(results[2] + (results[3] || '')),
            prefix: results[1],
            name:   results[2],
            type:   results[1] ? 'property' : 'title',
            title: (results[1] || '') + results[2]
        });
        return data;
    },

    // .method() or function()
    3: function(data, results) {
        const object  = last(data);
        object.type   = results[1] ? 'method' : 'function' ;
        object.params = results[3];
        object.title  = Prism.highlight(
            (results[1] || '') + results[2] + results[3],
            Prism.languages['js'],
            'js'
        );
        return data;
    },

    // fn:param
    4: function(data, results) {
        const object = last(data);
        object.type  = 'fn';
        object.title = results[4] ?
            results[2] + ': ' + results[4] :
            results[2] ;
        return data;
    },

    // attribute="value"
    5: function(data, results) {
        const object = last(data);
        object.type  = 'attribute';
        object.title = results[2] + '="' + results[5] + '"';
        return data;
    },

    // <element>
    6: function(data, results) {
        data.push({
            id:     slugify(results[6]),
            prefix: '',
            name:   results[6],
            params: '',
            type:   'tag',
            title:  Prism.highlight(results[6], Prism.languages['html'], 'html')
        });
        return data;
    },

    // {[ tag ]}
    7: function (data, results) {
        data.push({
            id: slugify(results[7]),
            prefix: '',
            name: results[7],
            params: '',
            type: 'title',
            title: results[7]
        });
        return data;
    },

    // Markdown (anything) close comment
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
                return ids
                .map(slugify)
                .map(function(id) {
                    return docs.filter(function(doc) {
                        console.log(slugify(doc.name) === id, slugify(doc.name), id);
                        return slugify(doc.name) === id;
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

register('config', function() {
    return Stream.of(window.config);
});

register('docs', function(node, params) {
    const data = toHTML(params);
    const output = Stream.of();
    data.then(output.push);
    return output;
});

register('filter-method', function(node, params) {
    return this.map(function(array) {
        return array.reduce(function(output, data) {
            // Remove preceeding title where it is not followed by a
            // data of the right type
            if (data.type !== 'method' && output[output.length - 1] && output[output.length - 1].type === 'title') {
                --output.length;
            }

            if (data.type === 'title' || data.type === 'method') {
                output.push(data);
            }

            return output;
        }, []);
    });
});

register('filter-function', function(node, params) {
    return this.map(function(array) {
        return array.reduce(function(output, data) {
            // Remove preceeding title where it is not followed by a
            // data of the right type
            if (data.type !== 'function' && output[output.length - 1] && output[output.length - 1].type === 'title') {
                --output.length;
            }

            if (data.type === 'function' || data.type === 'title') {
                output.push(data);
            }

            return output;
        }, []);
    });
});

register('filter-fn', function (node, params) {
    return this.map(function (array) {
        return array.reduce(function (output, data) {
            if (data.type === 'fn') {
                output.push(data);
            }

            return output;
        }, []);
    });
});

register('filter-property', function(node, params) {
    return this.map(function(array) {
        return array.reduce(function(output, data) {
            // Remove preceeding title where it is not followed by a
            // data of the right type
            if (data.type !== 'property' && output[output.length - 1] && output[output.length - 1].type === 'title') {
                --output.length;
            }

            if (data.type === 'property' || data.type === 'title') {
                output.push(data);
            }

            return output;
        }, []);
    });
});

register('filter-tag', function(node, params) {
    return this.map(function(array) {
        return array.reduce(function(output, data) {
            // Remove preceeding title where it is not followed by a
            // data of the right type
            if (data.type !== 'tag' && output[output.length - 1] && output[output.length - 1].type === 'title') {
                --output.length;
            }

            if (data.type === 'tag' || data.type === 'title') {
                output.push(data);
            }

            return output;
        }, []);
    });
});

register('append', function(node, params) {
    const name = params[0];
    return this.tap((scope) => {
        // Avoid having Sparky parse the contents of documentation by waiting
        // until the next frame
        requestAnimationFrame(function() {
            const fragment = fragmentFromHTML(scope[name]);
            node.appendChild(fragment);
        });
    });
});

register('after', function (node, params) {
    const name = params[0];
    return this.tap((scope) => {
        // Avoid having Sparky parse the contents of documentation by waiting
        // until the next frame
        requestAnimationFrame(function () {
            const fragment = fragmentFromHTML(scope[name]);
            node.after(fragment);
        });
    });
});
