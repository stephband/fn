/*
invoke(name, parameters, object)
*/

export default function invoke(name, values, object) {
    return object[name].apply(object, values);
}
