
import { getListeners, Observer, $observer, notify, noop } from './observer.js';
import parseSelector from './parse-selector.js';

const A       = Array.prototype;
const assign  = Object.assign;
const nothing = Object.freeze([]);

//               1 .         2 .name        [    3 'quote' 4 "quote" 5 number ]
const rpath   = /(\.\s*$)|\.?([^.[\s]+)\s*|\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|\[\s*/;

function isPrimitive(object) {
    return !(object && typeof object === 'object');
}

function remove(objects, object) {
    var i = objects.indexOf(object);
    objects.splice(i, 1);
}

function PrimitiveObserver(primitive, data) {
	if (primitive !== data.value) {
		data.old   = data.value;
		data.value = primitive;
		data.fn(primitive);
	}
}

assign(PrimitiveObserver.prototype, {
    stop: noop
});

function MutableObserver(object, data) {
    this.fns = object[$observer].mutate;
    this.fns.push(this);
    this.data = data;

    if (object !== data.value) {
		data.old   = data.value;
		data.value = object;
		data.fn(object, {
			index:   0,
			removed: data.old ? data.old : nothing,
			added:   data.value
		});
	}
}

assign(MutableObserver.prototype, {
    update: noop,

    stop: function() {
        remove(this.fns, this);
    }
});



function SelectorObserver(object, isMatch, path, data) {
    this.isMatch = isMatch;
    this.path    = path;
    this.data    = data;

    // We create an intermediate data object to go with the new update
	// function. The original data object is passed on inside update.
	this.observer2 = new MutableObserver(object, data);
}

assign(SelectorObserver.prototype, {
    observer1: { stop: noop },
    observer2: { stop: noop },

    update: function(array) {
        var value = array && A.find.call(array, this.isMatch);
		this.observer1.stop();
		this.observer1 = UnknownObserver(value, this.path, this.data);
    },

    stop: function() {
        this.observer1.stop();
        this.observer2.stop();
    }
});

function PropertyObserver(object, name, path, data) {
	this.fns  = getListeners(object, name);
    this.fns.push(this);
    this.path = path;
    this.data = data;
	this.update(object[name]);
}

assign(PropertyObserver.prototype, {
    observer: { stop: noop },

    update: function(value) {
        this.observer.stop();
        this.observer = UnknownObserver(value, this.path, this.data);
    },

    stop: function() {
        this.observer.stop();
        remove(this.fns, this);
    }
});

function SelectorImmutable(object, isMatch, path, data) {
	var value = object && A.find.call(object, isMatch);
	return UnknownObserver(Observer(value) || value, path, data);
}

function PropertyImmutable(object, name, path, data) {
	return UnknownObserver(Observer(object[name]) || object[name], path, data);
}

function UnknownObserver(object, path, data) {
    // path is ''
    if (!path.length) {
		return new PrimitiveObserver(object, data) ;
	}

    // path is '.'
    if (path === '.') {
        // We assume the full isObserver() check has been done –
        // this function is internal after all
        return object && object[$observer] ?
            new MutableObserver(object, data) :
            new PrimitiveObserver(object, data) ;
    }

    // Object is primitive
    if (isPrimitive(object)) {
		return new PrimitiveObserver(undefined, data);
	}

    const tokens = rpath.exec(path);

    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + path + ' : ' + path.length);
    }

    // path is .name, [number], ['name'] or ["name"]
    const name = tokens[2] || tokens[3] || tokens[4] || tokens[5] ;

    if (name) {
        path = tokens.input.slice(tokens.index + tokens[0].length);
        return object[$observer] ?
            new PropertyObserver(object, name, path, data) :
            PropertyImmutable(object, name, path, data) ;
    }

    const isMatch = parseSelector(null, tokens);
    path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

    // path is '[key=value]'
    return object[$observer] ?
        new SelectorObserver(object, isMatch, path, data) :
        SelectorImmutable(object, isMatch, path, data) ;
}

export function observe(path, object, fn) {
    const observer = UnknownObserver(Observer(object) || object, path + '', {
        value: undefined,
        fn:    fn
    });

    return function unobserve() {
        observer.stop();
    };
}
