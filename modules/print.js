import { concat } from './lists/core.js';

export default function print() {
    var args = arguments;
    return function print(object) {
        console.log.apply(console, concat(arguments, args));
        return object;
    };
}
