import Stream, { push, stop } from './stream.js';

/**
MergeMap(fn)
An improved flatMap implementation that properly handles streams as return values.
Maps each value in a stream through `fn`, producing a value, array, promise, or
another stream. Inner streams are properly subscribed to and managed.
**/

export class MergeMap extends Stream {
    constructor(fn) {
        super();
        this.fn = fn;
        // Map of active inner streams to their unsubscribe functions
        this.activeStreams = new Map();
    }
    
    push(value) {
        const fn = this.fn;
        const values = fn(value);
        
        if (values === undefined) return;
        
        // Flatten array or array-like
        if (values && typeof values[Symbol.iterator] === 'function') {
            for (const value of values) {
                push(this, value);
            }
        }
        // Flatten stream
        else if (values && typeof values.pipe === 'function') {
            if (this.status === 'done') return;
            
            // Create a subscription to the inner stream
            const innerStream = values;
            
            // Track this inner stream
            this.activeStreams.set(innerStream, true);
            
            // Subscribe to inner stream
            innerStream
                .each((innerValue) => {
                    if (this.status !== 'done') {
                        push(this, innerValue);
                    }
                })
                .done(() => {
                    // Clean up completed inner stream
                    this.activeStreams.delete(innerStream);
                });
        }
        // Flatten promise
        else if (values && typeof values.then === 'function') {
            values.then((value) => {
                if (this.status !== 'done') {
                    push(this, value);
                }
            });
        }
        // Regular value
        else {
            push(this, values);
        }
    }
    
    // Override stop to also stop all active inner streams
    stop() {
        if (this.status === 'done') return this;
        
        // Stop all active inner streams
        for (const innerStream of this.activeStreams.keys()) {
            innerStream.stop();
        }
        this.activeStreams.clear();
        
        // Call the parent stop implementation
        return super.stop();
    }
}

/**
SwitchMap(fn)
Maps values to streams but switches to the latest stream, canceling previous
inner streams whenever a new value arrives.
**/

export class SwitchMap extends Stream {
    constructor(fn) {
        super();
        this.fn = fn;
        this.currentStream = null;
    }
    
    push(value) {
        const fn = this.fn;
        const result = fn(value);
        
        if (result === undefined) return;
        
        // If we have a previous inner stream, stop it
        if (this.currentStream) {
            this.currentStream.stop();
            this.currentStream = null;
        }
        
        // Handle different return types
        if (result && typeof result.pipe === 'function') {
            // Handle stream result
            this.currentStream = result;
            
            result
                .each((innerValue) => {
                    if (this.status !== 'done') {
                        push(this, innerValue);
                    }
                })
                .done(() => {
                    if (this.currentStream === result) {
                        this.currentStream = null;
                    }
                });
        }
        else if (result && typeof result[Symbol.iterator] === 'function') {
            // Handle array-like result
            for (const item of result) {
                push(this, item);
            }
        }
        else if (result && typeof result.then === 'function') {
            // Handle promise result
            result.then((resolvedValue) => {
                if (this.status !== 'done') {
                    push(this, resolvedValue);
                }
            });
        }
        else {
            // Handle regular value
            push(this, result);
        }
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Stop current inner stream if it exists
        if (this.currentStream) {
            this.currentStream.stop();
            this.currentStream = null;
        }
        
        return super.stop();
    }
}

/**
ConcatMap(fn)
Maps values to streams but processes them in sequence, only subscribing to
the next inner stream when the previous one completes.
**/

export class ConcatMap extends Stream {
    constructor(fn) {
        super();
        this.fn = fn;
        this.queue = [];
        this.processing = false;
    }
    
    processQueue() {
        if (this.processing || this.queue.length === 0 || this.status === 'done') {
            return;
        }
        
        this.processing = true;
        const next = this.queue.shift();
        
        if (next && typeof next.pipe === 'function') {
            // It's a stream
            next
                .each((value) => {
                    if (this.status !== 'done') {
                        push(this, value);
                    }
                })
                .done(() => {
                    this.processing = false;
                    this.processQueue();
                });
        }
        else if (next && typeof next[Symbol.iterator] === 'function') {
            // It's an iterable
            for (const value of next) {
                push(this, value);
            }
            this.processing = false;
            this.processQueue();
        }
        else if (next && typeof next.then === 'function') {
            // It's a promise
            next.then((value) => {
                if (this.status !== 'done') {
                    push(this, value);
                }
                this.processing = false;
                this.processQueue();
            });
        }
        else {
            // Regular value
            push(this, next);
            this.processing = false;
            this.processQueue();
        }
    }
    
    push(value) {
        if (this.status === 'done') return;
        
        const fn = this.fn;
        const result = fn(value);
        
        if (result === undefined) return;
        
        // Add to queue and process
        this.queue.push(result);
        this.processQueue();
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Clear the queue
        this.queue = [];
        this.processing = false;
        
        return super.stop();
    }
}

// Add methods to Stream prototype
Stream.prototype.mergeMap = function(fn) {
    return this.pipe(new MergeMap(fn));
};

Stream.prototype.switchMap = function(fn) {
    return this.pipe(new SwitchMap(fn));
};

Stream.prototype.concatMap = function(fn) {
    return this.pipe(new ConcatMap(fn));
};

// Replace the original flatMap with mergeMap for better semantics
Stream.prototype.flatMap = Stream.prototype.mergeMap;