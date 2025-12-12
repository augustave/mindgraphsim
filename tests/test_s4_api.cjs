const fs = require('fs');
const path = require('path');

// --- Mock DOM & Canvas (Robust) ---
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
    getBoundingClientRect: () => ({ width: 800, height: 600 })
};

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({}) };
global.document = {
    getElementById: () => mockElement,
    addEventListener: () => { },
    body: mockElement,
    createElement: () => mockElement,
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => { };

// --- Load Engine ---
const enginePath = path.join(__dirname, '../mgs-engine.js');
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Exposed via window replacement at end of file, so we just eval.
// Need to expose internal globals if accessed directly, but we use public API.
engineCode = engineCode.replace(/let physicsConfig =/g, 'global.physicsConfig ='); // For runScenarioStep verification

try { eval(engineCode); } catch (e) { console.error("Error loading engine:", e); process.exit(1); }

const engineListModels = window.listModels;
const engineApplyModel = window.applyModel;
const engineGetCurrentContext = window.getCurrentContext;
const engineRunScenarioStep = window.runScenarioStep;

if (!engineListModels || !engineApplyModel || !engineGetCurrentContext || !engineRunScenarioStep) {
    console.error("FAIL: Missing S4 APIs.");
    process.exit(1);
}

console.log("Testing S4 API Extensions...");

// 1. Test listModels
const models = engineListModels();
if (models.length >= 3 && models.find(m => m.id === 'baseline')) {
    console.log("PASS: listModels returned expected registry.");
} else {
    console.error("FAIL: listModels output invalid:", models);
}

// 2. Test applyModel and getCurrentContext
engineApplyModel('high_damping');
const ctx = engineGetCurrentContext();
if (ctx.modelId === 'high_damping') {
    console.log("PASS: applyModel updated context.modelId.");
} else {
    console.error("FAIL: modelId mismatch. Expected 'high_damping', got", ctx.modelId);
}

if (typeof ctx.overloads !== 'undefined' && typeof ctx.patternCount !== 'undefined') {
    console.log("PASS: getCurrentContext includes S4 fields (overloads, patternCount).");
} else {
    console.error("FAIL: Missing overloads or patternCount in context:", ctx);
}

// 3. Test runScenarioStep
const initNoise = physicsConfig.noise.base_strength; // Use global ref
const testEvent = { at_step: 100, target: 'ambient', channel: 'noise.base_strength', mode: 'add', magnitude: 0.5 };

engineRunScenarioStep([testEvent], 99); // Should do nothing
if (Math.abs(physicsConfig.noise.base_strength - initNoise) > 0.001) {
    console.error("FAIL: runScenarioStep applied event prematurely.");
}

engineRunScenarioStep([testEvent], 100); // Should apply

if (Math.abs(physicsConfig.noise.base_strength - (initNoise + 0.5)) < 0.001) {
    console.log("PASS: runScenarioStep applied event correctly.");
} else {
    console.error(`FAIL: runScenarioStep value mismatch. Got ${physicsConfig.noise.base_strength}`);
}

console.log("S4 API Verification Complete.");
