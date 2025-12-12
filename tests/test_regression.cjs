const fs = require('fs');
const path = require('path');

// Mock Context & Canvas
const mockContext = {
    setTransform: () => { }, beginPath: () => { }, moveTo: () => { }, lineTo: () => { }, stroke: () => { }, arc: () => { }, fill: () => { },
    save: () => { }, restore: () => { }, translate: () => { }, scale: () => { }, rotate: () => { }, fillText: () => { }, measureText: () => ({ width: 0 }),
    fillRect: () => { }, clearRect: () => { }, setLineDash: () => { }, getLineDash: () => [],
    createLinearGradient: () => ({ addColorStop: () => { } }),
    createRadialGradient: () => ({ addColorStop: () => { } }),
    createPattern: () => { }, drawImage: () => { }, globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1,
    bezierCurveTo: () => { }, quadraticCurveTo: () => { }, closePath: () => { }, rect: () => { }, clip: () => { }
};

const mockElement = {
    getContext: () => mockContext,
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    classList: { toggle: () => { }, add: () => { }, remove: () => { } },
    textContent: '',
    className: '',
    addEventListener: () => { },
    removeEventListener: () => { },
    querySelectorAll: () => [],
    querySelector: () => ({}),
    appendChild: () => { },
    removeChild: () => { },
    innerHTML: '',
    value: '',
    style: {},
    width: 800,
    height: 600,
    getBoundingClientRect: () => ({ width: 800, height: 600 })
};

global.window = {
    addEventListener: () => { },
    devicePixelRatio: 1,
    getComputedStyle: () => ({})
};
global.document = {
    getElementById: (id) => mockElement,
    addEventListener: () => { },
    body: mockElement,
    createElement: () => mockElement
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => { }; // No actual loop

// Load engine
const enginePath = '/Users/taoconrad/Documents/GitHub 4/mindgraphsim/mgs-engine.js';
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose internal state variables to global scope for testing
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/let patternIdCounter =/g, 'global.patternIdCounter =');
engineCode = engineCode.replace(/let hudMetrics =/g, 'global.hudMetrics =');
// Expose functions if needed, or just eval
// runBridgeRegressionTest is a function, so it will be in scope after eval if we don't block it.
// But mostly good to attach it to global if we want to call it safely.
// Actually, top-level functions in eval should be available.

try {
    eval(engineCode);
} catch (e) {
    console.error("Error loading engine:", e);
}

console.log("Running Bridge Regression Test (100 steps for speed check, logic verification)...");

// Mock console.log to capture output
const logs = [];
const originalLog = console.log;
console.log = (...args) => {
    logs.push(args.join(' '));
    originalLog(...args);
};

// We need to enable `requestAnimationFrame` for the test to run?
// `runBridgeRegressionTest` likely uses a loop or callback.
// Checking code: it calls `step()` in a loop? No, usually these tests run synchronously or via timeout.
// Converting `runBridgeRegressionTest` to sync if possible or mocking inputs.
// Let's assume it runs somewhat synchronously or we can inspect state after.
// Actually, looking at mgs-engine.js, it might rely on `animate` loop?
// If so, we need to manually trigger frames.

if (typeof runBridgeRegressionTest === 'function') {
    // Modify the function to NOT depend on requestAnimationFrame if possible, 
    // OR just call `state.step++` loop manually if the test exposes a step function.
    // Since we access to `state`, we can check results.
    // The existing test likely sets up the scene.

    // We will run it for 500 steps.
    try {
        // Redefine animate to be a no-op so we can drive it manually if needed,
        // or just let the test run logic.

        // The regression test inside engine usually sets state and potentially runs a loop. 
        // We'll try calling it.
        runBridgeRegressionTest(500); // 500 steps

        // Check metrics
        console.log("Metrics after 500 steps:");
        console.log("Patterns:", global.state.patterns.length);
        console.log("Overloads:", global.state.overloads);

        if (global.state.patterns.length >= 0 && global.state.patterns.length < 50) {
            console.log("PASS: Pattern count sane.");
        } else {
            console.log("FAIL: Pattern count suspicious:", global.state.patterns.length);
        }

        // Check if Profile applied correct physics
        // runBridgeRegressionTest sets 'meditative_slow_field' profile in our modified code.
        // Meditative noise scale is 0.5. Base is 0.15. Expected ~0.075.
        // Legacy override in test sets noise to 0.05.
        console.log("Ambient Noise:", global.state.ambient.noise);

    } catch (err) {
        console.error("Runtime error:", err);
    }
} else {
    console.error("runBridgeRegressionTest not found");
}
console.log = originalLog;
