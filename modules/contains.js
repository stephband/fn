export default function contains(value, object) {
    return object.includes ?
        object.includes(value) :
    object.contains ?
        object.contains(value) :
    A.includes ?
        A.includes.call(object, value) :
        A.indexOf.call(object, value) !== -1 ;
};
