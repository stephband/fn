
import noop from '../noop.js';
import remove from '../lists/remove.js';
import { getListeners, Observer, $observer } from './observer.js';
import parseSelector from './parse-selector.js';

const DEBUG = true;

if (DEBUG) { window.observeCount = 0; }

const A       = Array.prototype;
const nothing = Object.freeze([]);

//                   1 .name         [2 number  3 'quote' 4 "quote" ]
const rpath   = /^\.?([^.[\s]+)\s*|^\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|^\[\s*/;

function isPrimitive(object) {
    return !(object && typeof object === 'object');
}

function observePrimitive(primitive, data) {
	if (primitive !== data.value) {
		data.old   = data.value;
		data.value = primitive;
		data.fn(primitive);
	}

	return noop;
}

function observeMutable(object, data) {
	var fns = object[$observer].mutate;
	fns.push(data.fn);

    if (DEBUG) { ++window.observeCount; }

	if (object !== data.value) {
		data.old   = data.value;
		data.value = object;
		data.fn(object, {
			index:   0,
			removed: data.old ? data.old : nothing,
			added:   data.value
		});
	}

	return () => {
		remove(fns, data.fn);

        if (DEBUG) { --window.observeCount; }
	};
}

function observeSelector(object, isMatch, path, data) {
	var unobserve = noop;

	function update(array) {
		var value = array && A.find.call(array, isMatch);
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	// We create an intermediate data object to go with the new update
	// function. The original data object is passed on inside update.
	var unobserveMutable = observeMutable(object, { fn: update });

	return () => {
		unobserve();
		unobserveMutable();
	};
}

function observeProperty(object, name, path, data) {
	var fns = getListeners(object, name);
	var unobserve = noop;

	function update(value) {
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	fns.push(update);
    update(object[name]);

    if (DEBUG) { ++window.observeCount; }

	return () => {
		unobserve();
		remove(fns, update);

        if (DEBUG) { --window.observeCount; }
	};
}

function readSelector(object, isMatch, path, data) {
	var value = object && A.find.call(object, isMatch);
	return observeUnknown(Observer(value) || value, path, data);
}

function readProperty(object, name, path, data) {
	return observeUnknown(Observer(object[name]) || object[name], path, data);
}

function observeUnknown(object, path, data) {
    // path is ''
    if (!path.length) {
		return observePrimitive(object, data) ;
	}

    // path is '.'
    if (path === '.') {
        // We assume the full isObserver() check has been done –
        // this function is internal after all
        return object && object[$observer] ?
            observeMutable(object, data) :
            observePrimitive(object, data) ;
    }

    // Object is primitive
    if (isPrimitive(object)) {
		return observePrimitive(undefined, data);
	}

    const tokens = rpath.exec(path);

    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + path + ' : ' + path.length);
    }

    // path is .name, [number], ['name'] or ["name"]
    const name = tokens[1] || tokens[2] || tokens[3] || tokens[4] ;

    if (name) {
        path = tokens.input.slice(tokens.index + tokens[0].length);
        return object[$observer] ?
            observeProperty(object, name, path, data) :
            readProperty(object, name, path, data) ;
    }

    const isMatch = parseSelector(tokens);
    path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

    // path is '[key=value]'
    return object[$observer] ?
        observeSelector(object, isMatch, path, data) :
        readSelector(object, isMatch, path, data) ;
}

/**
observe(path, fn, object [, init])

Observe `path` in `object` and call `fn(value)` with the value at the
end of that path when it mutates. Returns a function that destroys this
observer.

The callback `fn` is called immediately on initialisation if the value at
the end of the path is not equal to `init`. In the default case where
`init` is `undefined`, paths that end in `undefined` do not cause the
callback to be called.

(To force the callback to always be called on setup, pass in `NaN` as an
`init` value. In JS `NaN` is not equal to anything, even `NaN`, so it
always initialises.)
**/

export function observe(path, fn, object, initialValue) {
    return observeUnknown(Observer(object) || object, path + '', {
        value: initialValue,
        fn:    fn
    });
}

export function observeAll(paths, object, initialValues) {
    const unobservers = Object
        .keys(paths)
        .map((path) => observe(path, paths[path], object, initialValues && initialValues[path]));

    return function unobserve() {
        unobservers.forEach((unobserve) => unobserve());
    };
}


/* FUTURE returns observer object */

function Observe(path, fn, object, initialValue) {
    this.value = initialValue;
    this.fn    = fn;

    observeUnknown(Observer(object) || object, path + '', this);
}

Observe.prototype.stop = function stop() {};
