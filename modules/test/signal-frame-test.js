
import noop              from 'fn/noop.js';
import overload          from 'fn/overload.js';
import Signal, { FrameSignal } from 'fn/signal.js';
import test, { done as testDone } from 'fn/test.js';
import events            from 'dom/events.js';
import requestBuffer     from 'stage/modules/request-buffer.js';
import { createContext } from 'stage/modules/context.js';





// Test that observer stops at the right time
/*test('Nested Signal.frame() throws error', [], (test, done) => {
    const a = Signal.of(0);
    const b = Signal.of(0);

    try {
        Signal.frame(() => {
            Signal.frame(() => {});
        });
    }
    catch (e) {
        done();
    }
});*/

// Test that observer stops at the right time
test('Nested Signal.frame() does not persist after outer signal closed', [
    'outer', 0,
    'inner', 0,
    'inner', 1,
    'outer', 1,
    'inner', 1,
    'inner', 2
], (test, done) => {
    const a = Signal.of(0);
    const b = Signal.of(0);

    Signal.frame(() => {
        test('outer');
        test(a.value);
        Signal.frame(() => {
            test('inner');
            test(b.value);
        });
    });

    // Should only trigger render of inner frame
    b.value = 1;
    setTimeout(() => {
        // Should rerender both
        a.value = 1;
        setTimeout(() => {
            // There should only be one inner at this point, the old one should
            // have been stopped and the new one will log 'inner', 2.
            b.value = 2;
            setTimeout(done, 100);
        }, 100);
    }, 100);
});







// Initialize test elements
const paramValueEl = document.getElementById('param-value');
const frameCountEl = document.getElementById('frame-count');
const timeDisplayEl = document.getElementById('time-display');
const canvas = document.getElementById('value-graph');
const ctx = canvas.getContext('2d');

// Initialise audio
const context  = createContext();
const gainNode = context.createGain();
gainNode.gain.value = 0;
gainNode.connect(context.destination);

// Wait for shit to load or warm up
const [buffer] = await Promise.all([
    //requestBuffer(context, '/stage-test-audio/04 The Mother Lode.mp3'),
    context.resume()
]);

// For drawing the parameter value
const values = [];
const times = [];
let frameCount = 0;

// Draw the parameter value over time
function drawValues() {
    if (values.length < 2) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate time scale factor (we want to fit the entire automation in view)
    const startTime = times[0];
    const timeSpan = times[times.length - 1] - startTime;
    const timeScale = canvas.width / (timeSpan || 1);

    // Draw background grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    // Draw horizontal lines
    for (let y = 0; y <= 1; y += 0.25) {
        const canvasY = canvas.height - (y * canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvasY);
        ctx.lineTo(canvas.width, canvasY);
        ctx.stroke();
    }

    // Draw value line
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const time = times[i];
        const x = (time - startTime) * timeScale;
        const y = canvas.height - (value * canvas.height);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}

// Basic test for FrameSignal with scheduled parameter changes
test('FrameSignal tracks AudioParam changes', [true, true], (expect, done) => {
    // Clear previous values
    values.length = 0;
    times.length = 0;
    frameCount = 0;

    // Schedule parameter changes
    const now = context.currentTime;
    const param = gainNode.gain;

    // Clear any previous automation
    param.cancelScheduledValues(now);
    param.value = 0;

    // Schedule a series of changes over 3 seconds
    param.linearRampToValueAtTime(0, now);
    param.linearRampToValueAtTime(1, now + 1);
    param.linearRampToValueAtTime(0.5, now + 2);
    param.linearRampToValueAtTime(0, now + 3);

    console.log(`Scheduled param changes: now=${now}, end=${now + 3}`);

    // Create observer that records parameter values
    const stopTime = now + 3.1;
    const observerFrameCounts = [];
    const observer = Signal.frame(() => {
        const currentTime = context.currentTime;
        const value = param.value;

        // Record frame
        frameCount++;

        // Update UI
        paramValueEl.textContent = `Param value: ${value.toFixed(4)}`;
        frameCountEl.textContent = `Frame count: ${frameCount}`;
        timeDisplayEl.textContent = `CurrentTime: ${currentTime.toFixed(3)}`;

        // Store for graphing
        values.push(value);
        times.push(currentTime);

        // Record frame count at specific times
        if (currentTime > now + 1 && observerFrameCounts.length === 0) {
            observerFrameCounts.push(frameCount);
        }
        if (currentTime > now + 2 && observerFrameCounts.length === 1) {
            observerFrameCounts.push(frameCount);
        }

        // Draw the updated graph
        drawValues();

        return context.currentTime < stopTime;
    });

    // Set up checks at specific times
    setTimeout(() => {
        // Check that observer is updating (frame count should be increasing)
        expect(frameCount > 0, "Observer should have started updating");

        // Set up another check after automation should be finished
        setTimeout(() => {
            // Frames should have stopped incrementing
            const finalFrameCount = frameCount;

            // Wait a bit to ensure no more frames happen
            setTimeout(() => {
                expect(frameCount === finalFrameCount, "Observer should have stopped updating");

                // Clean up
                observer.stop();

                // Complete the test
                done();
            }, 500);
        }, 3200); // Check after automation end
    }, 500); // First check after 500ms
});

// Test creating observer and adding to queue
test('FrameSignal(() => false) adds observer to queue', [true], (expect, done) => {
    const stopTime = context.currentTime + 0.1;
    const observer = Signal.frame(() => {
        return context.currentTime < stopTime;
    });

    // Verify observer is in the static observers array
    expect(FrameSignal.observers.includes(observer), "Observer should be in the queue");

    // Clean up after test
    observer.stop();
    done();
});


// Test that observer stops at the right time
test('FrameSignal stops at validTime', [true], (expect, done) => {
    const startTime = context.currentTime;
    let lastTime = 0;
    let updateCount = 0;

    // Schedule to run for only 0.5 seconds
    const validTime = startTime + 0.5;

    const observer = Signal.frame(() => {
        lastTime = context.currentTime;
        updateCount++;
        return context.currentTime < validTime;
    });

    // Check after observer should be done
    setTimeout(() => {
        const finalCount = updateCount;

        // Wait a bit more to verify no more updates
        setTimeout(() => {
            // If observer stopped correctly, updateCount shouldn't change
            expect(updateCount === finalCount, "Observer should have stopped updating at validTime");

            // Clean up
            observer.stop();
            done();
        }, 300);
    }, 600);
});

// Test that observer stops at the right time
test('FrameSignal updates when dependencies change', [3, 0, 1, 4, 0], (expect, done) => {
    const startTime = context.currentTime;
    const signal    = Signal.of(3);
    const observer  = Signal.frame(() => {
        const value = signal.value;
        // 0 - should be 3
        // 3 - Should be 4
        expect(value);
    });

    setTimeout(() => {
        // 1 - Should be 0
        expect(FrameSignal.observers.length);

        signal.value = 2;
        signal.value = 4;
        // 2 - Should be 1
        expect(FrameSignal.observers.length);

        setTimeout(() => {
            // 4 - Should be 0
            expect(FrameSignal.observers.length);
            done();
        }, 100);
    }, 100);
});

// Report when all tests are complete
testDone((totals) => {
    console.log(`All tests complete. Passed: ${totals.pass}, Failed: ${totals.fail}`);
});
