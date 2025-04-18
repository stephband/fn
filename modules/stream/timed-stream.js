import Stream, { push, stop } from './stream.js';

/**
 * TimedStream - Base class for time-aware streams
 * 
 * Provides foundation for streams that have a concept of time,
 * with methods for sampling, throttling, and debouncing.
 * All time values are in seconds to match WebAudio conventions.
 */
export default class TimedStream extends Stream {
    constructor() {
        super();
        this.now = () => performance.now() / 1000; // Return seconds, not milliseconds
    }
    
    /**
     * Creates a timer that emits at regular intervals
     * 
     * @param {number} interval - Seconds between emissions
     * @returns {TimedStream} A new stream emitting at interval
     */
    static interval(interval) {
        const stream = new TimedStream();
        let count = 0;
        let timerId;
        
        stream.start = function() {
            if (this.status) return this;
            
            // Call standard start implementation
            Stream.prototype.start.apply(this);
            
            // Start the interval timer (convert seconds to ms)
            timerId = setInterval(() => {
                push(stream, count++);
            }, interval * 1000);
            
            return this;
        };
        
        stream.stop = function() {
            if (this.status === 'done') return this;
            
            // Clear the interval
            clearInterval(timerId);
            
            // Call standard stop implementation
            return Stream.prototype.stop.apply(this);
        };
        
        return stream;
    }
    
    /**
     * Creates a timer that emits after a delay
     * 
     * @param {number} delay - Seconds to wait before emitting
     * @param {*} value - Value to emit (defaults to undefined)
     * @returns {TimedStream} A new stream that emits once after delay
     */
    static timer(delay, value) {
        const stream = new TimedStream();
        let timerId;
        
        stream.start = function() {
            if (this.status) return this;
            
            // Call standard start implementation
            Stream.prototype.start.apply(this);
            
            // Start the timeout (convert seconds to ms)
            timerId = setTimeout(() => {
                push(stream, value);
                stream.stop();
            }, delay * 1000);
            
            return this;
        };
        
        stream.stop = function() {
            if (this.status === 'done') return this;
            
            // Clear the timeout
            clearTimeout(timerId);
            
            // Call standard stop implementation
            return Stream.prototype.stop.apply(this);
        };
        
        return stream;
    }
}

/**
 * Throttle - Emit a value, then ignore subsequent values for a specified duration
 */
export class Throttle extends TimedStream {
    constructor(duration) {
        super();
        this.duration = duration;
        this.lastEmitTime = 0;
    }
    
    push(value) {
        const currentTime = this.now();
        
        if (currentTime - this.lastEmitTime >= this.duration) {
            this.lastEmitTime = currentTime;
            push(this, value);
        }
    }
}

/**
 * Debounce - Only emit after a specified period of silence
 */
export class Debounce extends TimedStream {
    constructor(duration) {
        super();
        this.duration = duration;
        this.timerId = null;
        this.pendingValue = undefined;
    }
    
    push(value) {
        this.pendingValue = value;
        
        // Clear any existing timer
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
        }
        
        // Set a new timer (convert seconds to ms)
        this.timerId = setTimeout(() => {
            push(this, this.pendingValue);
            this.timerId = null;
        }, this.duration * 1000);
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Clear any pending timer
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        
        return super.stop();
    }
}

/**
 * Sample - Sample the most recent value at regular intervals
 */
export class Sample extends TimedStream {
    constructor(interval) {
        super();
        this.interval = interval;
        this.timerId = null;
        this.latestValue = undefined;
        this.hasValue = false;
    }
    
    push(value) {
        this.latestValue = value;
        this.hasValue = true;
    }
    
    start() {
        if (this.status) return this;
        
        // Call standard start implementation
        super.start();
        
        // Start the sampling interval (convert seconds to ms)
        this.timerId = setInterval(() => {
            if (this.hasValue) {
                push(this, this.latestValue);
                this.hasValue = false;
            }
        }, this.interval * 1000);
        
        return this;
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Clear the interval
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        return super.stop();
    }
}

/**
 * Delay - Delay each value by the specified duration
 */
export class Delay extends TimedStream {
    constructor(duration) {
        super();
        this.duration = duration;
    }
    
    push(value) {
        if (this.status === 'done') return;
        
        // Convert seconds to ms for setTimeout
        setTimeout(() => {
            if (this.status !== 'done') {
                push(this, value);
            }
        }, this.duration * 1000);
    }
}

/**
 * Buffer - Collect values over time and emit as arrays
 */
export class TimeBuffer extends TimedStream {
    constructor(duration) {
        super();
        this.duration = duration;
        this.buffer = [];
        this.timerId = null;
    }
    
    push(value) {
        if (this.status === 'done') return;
        
        // Add to buffer
        this.buffer.push(value);
        
        // If this is the first value, start the timer (convert seconds to ms)
        if (this.timerId === null) {
            this.timerId = setTimeout(() => {
                const values = this.buffer;
                this.buffer = [];
                this.timerId = null;
                
                if (values.length > 0) {
                    push(this, values);
                }
            }, this.duration * 1000);
        }
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Clear any pending timer
        if (this.timerId !== null) {
            clearTimeout(this.timerId);
            this.timerId = null;
            
            // Emit any buffered values before stopping
            if (this.buffer.length > 0) {
                push(this, this.buffer);
                this.buffer = [];
            }
        }
        
        return super.stop();
    }
}

/**
 * WindowTime - Collect values into overlapping time windows
 */
export class WindowTime extends TimedStream {
    constructor(windowDuration, windowCreationInterval = null) {
        super();
        this.windowDuration = windowDuration;
        this.windowCreationInterval = windowCreationInterval || windowDuration;
        this.windows = [];
        this.timerId = null;
    }
    
    start() {
        if (this.status) return this;
        
        // Call standard start implementation
        super.start();
        
        // Create a new window immediately
        this.createWindow();
        
        // Start creating windows at regular intervals (convert seconds to ms)
        if (this.windowCreationInterval > 0) {
            this.timerId = setInterval(
                () => this.createWindow(), 
                this.windowCreationInterval * 1000
            );
        }
        
        return this;
    }
    
    createWindow() {
        const window = {
            values: [],
            // Convert seconds to ms for setTimeout
            timerId: setTimeout(() => {
                // Remove this window from the list
                const index = this.windows.indexOf(window);
                if (index !== -1) {
                    this.windows.splice(index, 1);
                }
                
                // Emit the window values
                if (window.values.length > 0) {
                    push(this, window.values);
                }
            }, this.windowDuration * 1000)
        };
        
        this.windows.push(window);
    }
    
    push(value) {
        if (this.status === 'done') return;
        
        // Add the value to all active windows
        for (const window of this.windows) {
            window.values.push(value);
        }
    }
    
    stop() {
        if (this.status === 'done') return this;
        
        // Clear the window creation interval
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        // Clear all windows and emit their values
        for (const window of this.windows) {
            clearTimeout(window.timerId);
            if (window.values.length > 0) {
                push(this, window.values);
            }
        }
        this.windows = [];
        
        return super.stop();
    }
}

// Add time methods to Stream prototype
Stream.prototype.throttle = function(duration) {
    return this.pipe(new Throttle(duration));
};

Stream.prototype.debounce = function(duration) {
    return this.pipe(new Debounce(duration));
};

Stream.prototype.sample = function(interval) {
    return this.pipe(new Sample(interval));
};

Stream.prototype.delay = function(duration) {
    return this.pipe(new Delay(duration));
};

Stream.prototype.bufferTime = function(duration) {
    return this.pipe(new TimeBuffer(duration));
};

Stream.prototype.windowTime = function(windowDuration, windowCreationInterval) {
    return this.pipe(new WindowTime(windowDuration, windowCreationInterval));
};