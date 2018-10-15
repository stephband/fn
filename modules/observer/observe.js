
import noop from '../noop.js';
import { getListeners, Observer, $observer } from './observer.js';
import parseSelector from './parse-selector.js';

const A       = Array.prototype;
const assign  = Object.assign;
const nothing = Object.freeze([]);

//                   1 .name         [2 number  3 'quote' 4 "quote" ]
const rpath   = /^\.?([^.[\s]+)\s*|^\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|^\[\s*/;

function isPrimitive(object) {
    return !(object && typeof object === 'object');
}

function remove(objects, object) {
    var i = objects.indexOf(object);
    objects.splice(i, 1);
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

	return () => {
		unobserve();
		remove(fns, update);
	};
}

function immutableSelector(object, isMatch, path, data) {
	var value = object && A.find.call(object, isMatch);
	return observeUnknown(Observer(value) || value, path, data);
}

function immutableProperty(object, name, path, data) {
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
            immutableProperty(object, name, path, data) ;
    }

    const isMatch = parseSelector(null, tokens);
    path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

    // path is '[key=value]'
    return object[$observer] ?
        observeSelector(object, isMatch, path, data) :
        immutableSelector(object, isMatch, path, data) ;
}

export function observe(path, fn, object) {
    return observeUnknown(Observer(object) || object, path + '', {
        value: undefined,
        fn:    fn
    });
}
