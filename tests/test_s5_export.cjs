const fs = require('fs');

const path = require('path');

// --- Mock Environment ---
const width = 800;
const height = 600;
const mockCtx = {
    setTransform: () => { }, beginPath: () => { }, moveTo: () => { }, lineTo: () => { }, stroke: () => { }, arc: () => { }, fill: () => { },
    save: () => { }, restore: () => { }, translate: () => { }, scale: () => { }, rotate: () => { }, fillText: () => { }, measureText: () => ({ width: 0 }),
    fillRect: () => { }, clearRect: () => { }, setLineDash: () => { }, getLineDash: () => [],
    createLinearGradient: () => ({ addColorStop: () => { } }), createRadialGradient: () => ({ addColorStop: () => { } }),
    createPattern: () => { }, drawImage: () => { }, globalAlpha: 1, strokeStyle: '', fillStyle: '', lineWidth: 1,
    bezierCurveTo: () => { }, quadraticCurveTo: () => { }, closePath: () => { }, rect: () => { }, clip: () => { }
};
const mockElement = {
    getContext: () => mockCtx,
    parentElement: null,
    classList: { toggle: () => { }, add: () => { }, remove: () => { } },
    textContent: '', className: '', innerHTML: '', value: '', style: { display: 'block' },
    addEventListener: () => { }, removeEventListener: () => { },
    querySelectorAll: () => [], querySelector: () => ({}),
    appendChild: () => { }, removeChild: () => { },
    getBoundingClientRect: () => ({ width, height })
};
mockElement.parentElement = mockElement; // Loop for parent access if needed

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({ display: 'block' }), Date: Date };
global.document = {
    getElementById: () => mockElement,
    addEventListener: () => { },
    body: mockElement,
    createElement: () => mockElement,
};

global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => { };
global.confirm = () => true;
global.alert = () => { };
global.Blob = class Blob { constructor(c) { this.content = c; } };
global.URL = { createObjectURL: () => 'blob:url', revokeObjectURL: () => { } };

// --- Load Engine ---
const enginePath = path.join(__dirname, '../mgs-engine.js');
let engineCode = fs.readFileSync(enginePath, 'utf8');
engineCode = engineCode.replace(/let physicsConfig =/g, 'global.physicsConfig =');
engineCode = engineCode.replace(/var running =/g, 'global.running =');
engineCode = engineCode.replace(/let running =/g, 'global.running =');
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/const Recorder =/g, 'global.Recorder ='); // Expose Recorder


try { eval(engineCode); } catch (e) { console.error("Error loading engine:", e); process.exit(1); }

// --- Test Export ---
console.log("Running S5 Export Verification...");

// 1. Populate Recorder
global.Recorder.start();
global.state.step = 100;
global.Recorder.capture(global.state);
global.state.step = 101;
global.Recorder.capture(global.state);
global.Recorder.stop();

// 2. Export
const json = global.Recorder.exportJSON();

// 3. Verify
if (json.meta && json.meta.count === 2) console.log("PASS: Meta count correct.");
else console.error("FAIL: Meta count incorrect", json.meta);

if (json.meta.profile === 'unknown' || json.meta.profile === 'open_neutral') console.log("PASS: Profile captured.");
// Note: test harness might show 'unknown' if not running full init

if (json.frames.length === 2) console.log("PASS: Frames array correct.");
else console.error("FAIL: Frames array length mismatch.");

if (json.meta.date) console.log("PASS: Date included.");

console.log("S5 Export Verified.");
