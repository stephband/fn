import Stream, { push } from './stream.js';

/**
GeneratorStream - Creates a stream from a generator function
**/
export class GeneratorStream extends Stream {
    constructor(generator) {
        super();
        this.generator = generator;
        this.iterator = null;
    }

    start() {
        if (this.status) return this;
        
        // Set status to running
        this.status = 'running';
        
        // Initialize the iterator if not already done
        if (!this.iterator) {
            try {
                // Handle both generator functions and iterators
                this.iterator = typeof this.generator === 'function' 
                    ? this.generator() 
                    : this.generator;
            }
            catch(e) {
                console.error('Error initializing generator:', e);
                this.stop();
                return this;
            }
        }
        
        // Process the iterator
        this.processIterator();
        
        return this;
    }
    
    processIterator() {
        // Ensure we're not stopped
        if (this.status === 'done') return;
        
        try {
            const { value, done } = this.iterator.next();
            
            if (done) {
                // Generator is complete, stop the stream
                this.stop();
                return;
            }
            
            // Handle Promise result from async generators
            if (value && typeof value.then === 'function') {
                value
                    .then(resolvedValue => {
                        if (this.status !== 'done' && resolvedValue !== undefined) {
                            push(this, resolvedValue);
                        }
                        // Continue with next value
                        this.processIterator();
                    })
                    .catch(error => {
                        console.error('Error in async generator:', error);
                        this.stop();
                    });
            } 
            else if (value !== undefined) {
                // Push the value to outputs
                push(this, value);
                
                // Continue to the next value
                this.processIterator();
            }
            else {
                // Skip undefined values
                this.processIterator();
            }
        }
        catch(error) {
            console.error('Error processing generator:', error);
            this.stop();
        }
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // If the iterator has a return method, call it to allow cleanup
        if (this.iterator && typeof this.iterator.return === 'function') {
            try {
                this.iterator.return();
            }
            catch(e) {
                console.error('Error closing generator:', e);
            }
        }
        
        this.iterator = null;
        
        return super.stop();
    }
}

// Add support for generators to Stream.from
export function installGeneratorSupport() {
    // Save the original from method
    const originalFrom = Stream.from;
    
    // Extend from to handle generators
    Stream.from = function(source) {
        // Check if it's a generator function
        if (typeof source === 'function' && 
            (source.constructor.name === 'GeneratorFunction' || 
             source.constructor.name === 'AsyncGeneratorFunction')) {
            return new GeneratorStream(source);
        }
        
        // Check if it's an iterator
        if (source && 
            typeof source[Symbol.iterator] === 'function' && 
            typeof source !== 'string' && 
            !Array.isArray(source) && 
            typeof source.length !== 'number') {
            return new GeneratorStream(source);
        }
        
        // Check if it's an async iterator
        if (source && typeof source[Symbol.asyncIterator] === 'function') {
            return new GeneratorStream(source);
        }
        
        // Use the original from implementation for other types
        return originalFrom(source);
    };
}

// Usage examples:

// Example 1: Sync generator
// Stream.from(function* () {
//     yield 1;
//     yield 2;
//     yield 3;
// }).each(console.log);

// Example 2: Async generator
// Stream.from(async function* () {
//     yield 1;
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     yield 2;
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     yield 3;
// }).each(console.log);

// Example 3: Iterator
// const iterable = {
//     [Symbol.iterator]: function*() {
//         yield 1;
//         yield 2;
//         yield 3;
//     }
// };
// Stream.from(iterable).each(console.log);