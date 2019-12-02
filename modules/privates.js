
const $private = Symbol('private');

export default function privates(object) {
    return object[$private] ?
        object[$private] :
        Object.defineProperty(object, $private, {
            value: {}
        })[$private] ;
}
