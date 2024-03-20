
const $privates = Symbol('privates');

export default function privates(object) {
    return object[$privates]
        // Make privates as unenumerable as possible
        || Object.defineProperty(object, $privates, { value: {} })[$privates] ;
}
