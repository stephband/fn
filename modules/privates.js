
const $privates = Symbol('privates');

export default function privates(object) {
    return object[$privates]
        || Object.defineProperty(object, $privates, { value: {} })[$privates] ;
}
