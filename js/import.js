
// Globals for temporarily storing module callbacks
window._moduleImportN         = 0;
window._moduleImportCallbacks = {};
window._moduleImportPromises  = {};

function importModule(path) {
	var callbacks = window._moduleImportCallbacks;
	var promises  = window._moduleImportPromises;

	return promises[path] ||
		(promises[path] = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			const key    = ++window._moduleImportN + '-' + path;

			callbacks[key] = function(module) {
				resolve(module);
				delete callbacks[path];
				script.remove();
			};

			script.type = "module";
			script.textContent = `
				import * as module from "${path}";
				window._moduleImportCallbacks["${key}"](module);
			`;

			document.body.appendChild(script);
		}));
}

window.importModule = importModule;
