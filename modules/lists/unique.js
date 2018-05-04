import { reduce } from './core.js';

function uniqueReducer(array, value) {
    if (array.indexOf(value) === -1) { array.push(value); }
    return array;
}

export default function unique(object) {
    return object.unique ?
        object.unique() :
        reduce(uniqueReducer, [], object) ;
};
