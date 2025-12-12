const fs = require('fs');
const path = require('path');

// --- Mock Environment ---
const width = 800;
const height = 600;
const mockCtx = {
    setTransform: () => { }, beginPath: () => { }, moveTo: () => { }, lineTo: () => { }, stroke: () => { }, arc: () => { }, fill: () => { },
    save: () => { }, restore: () => { }, translate: () => { }, scale: () => { }, rotate: () => { }, fillText: () => { }, measureText: () => ({ width: 0 }),
    fillRect: () => { }, clearRect: () => { }, setLineDash: () => { }, getLineDash: () => [], drawImage: () => { },
    createPattern: () => { }, createRadialGradient: () => ({ addColorStop: () => { } }), createLinearGradient: () => ({ addColorStop: () => { } }),
    rect: () => { }, clip: () => { }, bezierCurveTo: () => { }, quadraticCurveTo: () => { }, closePath: () => { }
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
mockElement.parentElement = mockElement;

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({ display: 'block' }), Date: Date };
global.document = {
    getElementById: () => mockElement,
    addEventListener: () => { },
    body: mockElement,
    createElement: () => mockElement,
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => { };
global.Blob = class Blob { constructor(content) { this.content = content; } };
global.URL = {
    createObjectURL: (blob) => { global.capturedBlobContent = blob; return 'blob:mock'; },
    revokeObjectURL: () => { }
};

// --- Load Engine ---
const enginePath = path.join(__dirname, '../mgs-engine.js');
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose internals
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/const Recorder =/g, 'global.Recorder =');
engineCode = engineCode.replace(/const NarrativeGenerator =/g, 'global.NarrativeGenerator =');
engineCode = engineCode.replace(/let running =/g, 'global.running =');
engineCode = engineCode.replace(/resizeCanvas\(\);/g, 'void(0);');
engineCode = engineCode.replace(/loadScene\(.*?\);/g, 'void(0);');
engineCode = engineCode.replace(/animate\(\);/g, 'void(0);');


// Expose Physics Functions manually
engineCode += `
global.integratePhysics = integratePhysics;
global.applySemanticPositionalBias = applySemanticPositionalBias;
global.applyPatternInfluence = applyPatternInfluence;
global.updateEnergyStress = updateEnergyStress;
global.ambientStep = ambientStep;
global.activationStep = activationStep;
global.detectPatterns = detectPatterns;
global.updateHUDMetrics = updateHUDMetrics;
global.applyProfile = applyProfile;
global.applyFrame = applyFrame;
global.MATERIALS = MATERIALS;
`;



// Load Engine
try { eval(engineCode); } catch (e) {
    console.error("Engine Load Error:", e);
    process.exit(1);
}

// Ensure output dirs
const EXPORT_DIR = path.join(__dirname, '../docs/exports');
const NARRATIVE_DIR = path.join(__dirname, '../docs/narratives');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
if (!fs.existsSync(NARRATIVE_DIR)) fs.mkdirSync(NARRATIVE_DIR, { recursive: true });

// --- Run Portfolio Generation ---
console.log("Generating Portfolio Assets...");

// 1. Baseline Run
console.log("- Simulating Baseline Run...");
// Init Physics Context
global.applyProfile('open_neutral');
global.applyFrame('frame_open_exploration');

// Reset
global.state.objects = [];
global.state.edges = [];
global.state.patterns = [];
global.state.step = 0;
// Note: Can't call loadScene directly as it relies on UI. But we can manually init objects if needed.
// Actually, loadScene is defined in engine. Let's call it?
// Ah, I commented it out. But the function `loadScene` exists in global scope via eval? No, `const loadScene`?
// Let's check engine code. `const loadScene = ...` is not exported.
// But `window.loadScene = ...`? No.
// I'll assume I can just use `global.loadScene` if I modify engine to expose it or just use `eval`.
// Wait, `const loadScene` in top level scope of eval is effectively local to eval unless I assign to global.

// To fix this, I will manually clear state and add objects in script.
// Or better: regex engine code to `global.loadScene = loadScene`.
// But simpler: just add objects manually here.

global.state.objects = [
    { id: 'core', label: 'Core', role: 'Default', x: 0, y: 0, material: 'gold', activation: 1.0, mass: 10, charge: 1, vx: 0, vy: 0, fx: 0, fy: 0, sensory: 0.5, overloaded: false, overloadEnergy: 0, stress: 0, energy: 0, activationHistory: [] },
    { id: 'anchor1', label: 'Anchor 1', role: 'Anchor', x: -100, y: 0, material: 'iron', activation: 0.5, mass: 5, charge: 0.5, vx: 0, vy: 0, fx: 0, fy: 0, sensory: 0.5, overloaded: false, overloadEnergy: 0, stress: 0, energy: 0, activationHistory: [] },
    { id: 'anchor2', label: 'Anchor 2', role: 'Anchor', x: 100, y: 0, material: 'iron', activation: 0.5, mass: 5, charge: 0.5, vx: 0, vy: 0, fx: 0, fy: 0, sensory: 0.5, overloaded: false, overloadEnergy: 0, stress: 0, energy: 0, activationHistory: [] }
];
global.state.edges = [
    { id: 'e1', source: global.state.objects[0], target: global.state.objects[1], weight: 1, length: 100, stress: 0, sourceId: 'core', targetId: 'anchor1', tension: 0, recovered: 0, severed: false },
    { id: 'e2', source: global.state.objects[0], target: global.state.objects[2], weight: 1, length: 100, stress: 0, sourceId: 'core', targetId: 'anchor2', tension: 0, recovered: 0, severed: false }
];

// Hydrate materials
global.state.objects.forEach(o => {
    o.mat = global.MATERIALS[o.material];
    if (!o.mat) console.warn(`Material not found: ${o.material}`);
});



// Record
global.Recorder.start();
const dt = 0.016;
for (let i = 0; i < 300; i++) {
    // Manual Physics Loop
    global.integratePhysics(dt);
    global.applySemanticPositionalBias();
    global.applyPatternInfluence();
    global.updateEnergyStress(dt);
    global.ambientStep(dt);
    global.activationStep(dt);
    if (i % 5 === 0) global.detectPatterns();
    global.updateHUDMetrics();
    global.state.step++;
    global.Recorder.capture(global.state);
}
// Stop & Export
// Recorder.exportJSON returns a Blob URL usually, but in our headless Env it might fail if we don't mock Blob/URL properly.
// However, the Recorder inside mgs-engine.js creates a Blob.
// Let's inspect Recorder.exportJSON. It calls global.URL.createObjectURL(blob).
// My mock global.URL.createObjectURL returns empty string.
// So I can't easily get the data back unless I inspect Recorder internals or modify it.
// Recorder buffer is `recorderBuffer`. It is local to the module.
// But `Recorder.getMetadata` and getters?
// Wait, `exportJSON` calls `stop()` then builds a JSON string.
// CONST `exportJSON` logic:
// const json = JSON.stringify({ meta: ..., frames: recorderBuffer });
// const blob = new Blob([json], ...);
// const url = URL.createObjectURL(blob);
// downloadLink.href = url;

// I can't easily intercept the Blob content via `URL.createObjectURL` mock without changing the mock to capture it.
// Let's modify the mock to capture the blob content.

// global.URL.createObjectURL = (blob) => {
//     // blob is array of parts.
//     global.capturedBlobContent = blob; // Store for retrieval
//     return "mock_url";
// };

const data = global.Recorder.exportJSON();

if (data && data.frames && data.frames.length > 0) {
    const jsonString = JSON.stringify(data, null, 2);
    const exportFilePath = path.join(EXPORT_DIR, 'baseline_run.json');
    fs.writeFileSync(exportFilePath, jsonString, 'utf8');
    console.log(`- Exported baseline run to ${exportFilePath}`);

    // Generate Narrative
    const narrative = global.NarrativeGenerator.analyze(data.frames);

    const narrativeFilePath = path.join(NARRATIVE_DIR, 'baseline_narrative.md');
    fs.writeFileSync(narrativeFilePath, narrative, 'utf8');
    console.log(`- Generated baseline narrative to ${narrativeFilePath}`);
} else {
    console.error("Error: No frames recorded.");
}


console.log("Portfolio Asset Generation Complete.");
