
export function insert(fn, stream) {
    const target = stream.target;
    const inserted = fn(stream);
    inserted.target = target;
    return inserted;
}

export function cut(stream) {
    // Find parent of stream by moving through consumers from
    // the head of the stream
    let source = stream.source.stream;
    while (source.target !== stream) {
        source = source.target;
    }

    source.target = stream.target;
    return source;
}
