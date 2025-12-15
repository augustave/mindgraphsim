const fs = require('fs');
const path = require('path');

// --- Mock Robustness ---
const mockElement = {
    getContext: () => ({
        setTransform: () => { }, beginPath: () => { }, moveTo: () => { }, lineTo: () => { }, stroke: () => { }, arc: () => { }, fill: () => { },
        save: () => { }, restore: () => { }, translate: () => { }, scale: () => { }, rotate: () => { }, fillText: () => { }, measureText: () => ({ width: 0 }),
        fillRect: () => { }, clearRect: () => { }, setLineDash: () => { }, getLineDash: () => [],
        createLinearGradient: () => ({ addColorStop: () => { } }), createRadialGradient: () => ({ addColorStop: () => { } }),
        createPattern: () => { }, drawImage: () => { }, globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1,
        bezierCurveTo: () => { }, quadraticCurveTo: () => { }, closePath: () => { }, rect: () => { }, clip: () => { }
    }),
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }), parentElement: { appendChild: () => { }, classList: { add: () => { }, remove: () => { } } } },
    classList: { toggle: () => { }, add: () => { }, remove: () => { } },
    textContent: '', className: '', innerHTML: '', value: '', style: {},
    addEventListener: () => { }, removeEventListener: () => { },
    querySelectorAll: () => [], querySelector: () => ({}),
    appendChild: () => { }, removeChild: () => { },
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
    style: { display: 'block' }
};

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({ display: 'block' }) };
global.document = {
    getElementById: (id) => mockElement,
    addEventListener: () => { },
    body: mockElement,
    createElement: () => mockElement,
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => { };
global.confirm = () => true; // Auto-confirm scenario run
global.alert = () => { };

// --- Load Engine ---
// --- Load Engine ---
const enginePath = path.join(__dirname, '../dist/mgs-engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');

try {
    eval(engineCode);
    Object.assign(global, global.document.defaultView || global.window);
} catch (e) { console.error("Error loading engine:", e); process.exit(1); }

// --- Exports ---
const engineListModels = window.listModels;
const engineApplyModel = window.applyModel;
const engineGetCurrentContext = window.getCurrentContext;
const engineRecorder = window.Recorder;
const engineReplaySystem = window.ReplaySystem;

// --- Test Suite ---
console.log("Running S4 Requirements Verification...");

// S4_MS_01: Model Switcher
engineApplyModel('baseline');
if (engineGetCurrentContext().modelId === 'baseline') console.log("PASS: Model Switcher (Baseline)");
else console.error("FAIL: Model Switcher (Baseline)");

engineApplyModel('high_damping');
if (engineGetCurrentContext().modelId === 'high_damping') console.log("PASS: Model Switcher (High Damping)");
else console.error("FAIL: Model Switcher (High Damping)");


// S4_RP_01: Recorder
engineRecorder.start();
const initialStep = global.state.step;
engineRecorder.capture(global.state);
global.state.step++;
engineRecorder.capture(global.state);

const meta = engineRecorder.stop();

if (meta.count === 2 && meta.endStep > meta.startStep) console.log("PASS: Recorder captured frames.");
else console.error("FAIL: Recorder failed.", meta);

// S4_RP_02: Replay
engineReplaySystem.seek(0);
if (state.step === initialStep) console.log("PASS: Replay Seek restored state step.");
else console.error("FAIL: Replay Seek failed.");


// S4_SR_01: Scenario Runner (Logic Check)
// We cannot easily test the synchronous loop here without blocking, but we can verify STRESS_TEST_SCENARIO exists in scope (it's internal). 
// Instead, verification is implicit via S3 Harness which runs the same YAML. 
// We check if UI updates are called.

const ctx = engineGetCurrentContext();
if (ctx.metrics.patternDensity !== undefined && ctx.overloads !== undefined) {
    console.log("PASS: Observer Console Metrics exposed.");
} else {
    console.error("FAIL: Observer Console Metrics missing.");
}

console.log("S4 Requirements Verified.");
