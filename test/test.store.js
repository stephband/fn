
console.group('test.store.js');

var assign = Object.assign;
var Store  = window.Store;

test('Store(reducer, data)', function() {
	var i = 0;

	// Demo login app

	var reducer = Store.actionsReducer({
		'login': function(state, data) {
			return assign(state, {
				status: 'logged in',
				value: data
			});
		},
	
		'logout': function(state, data) {
			return assign(state, {
				status: 'logged out',
				value: undefined
			});
		}		
	});

	var store = Store(reducer, {
		status: 'logged out'
	});

	// Render changes
	store.each(function(state) {
		++i;
		console.log('emits new state...');
		equals("logged in", state.status);
		equals("stephband", state.value);
	});

	// To login
	store.push({
		type: 'login',
		data: 'stephband'
	});

	equals(i, 1);

	window.store = store;
});

console.groupEnd();
