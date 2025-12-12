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
mockElement.parentElement = mockElement;

global.window = { addEventListener: () => { }, devicePixelRatio: 1, getComputedStyle: () => ({ display: 'block' }), Date: Date };
global.document = { getElementById: () => mockElement, addEventListener: () => { }, body: mockElement, createElement: () => mockElement };
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = () => { };
global.Blob = class Blob { };
global.URL = { createObjectURL: () => '', revokeObjectURL: () => { } };

// --- Load Engine ---
const enginePath = path.join(__dirname, '../mgs-engine.js');
let engineCode = fs.readFileSync(enginePath, 'utf8');
engineCode = engineCode.replace(/let state =/g, 'global.state =');  // Expose state for init if needed
engineCode = engineCode.replace(/const NarrativeGenerator =/g, 'global.NarrativeGenerator ='); // Expose

// Disable auto-run
// engineCode = engineCode.replace(/resizeCanvas\(\);/g, '// resizeCanvas();'); // Let them run if mock works
// engineCode = engineCode.replace(/loadScene\('single_core_two_anchors'\);/g, '// loadScene();');
// engineCode = engineCode.replace(/animate\(\);/g, '// animate();');

try { eval(engineCode); } catch (e) { console.error("Error loading engine:", e); process.exit(1); }

// --- Test Data ---
const mockBuffer = [
    { step: 10, overloads: 0, metrics: { patternDensity: 1.0 }, patterns: [] },
    { step: 11, overloads: 1, metrics: { patternDensity: 2.0 }, patterns: [{ type: 'loop' }, { type: 'loop' }] },
    { step: 12, overloads: 3, metrics: { patternDensity: 3.5 }, patterns: [{ type: 'loop' }, { type: 'wave' }] }
];

// --- Run Analysis ---
console.log("Running S5 Narrative Verification...");

const result = global.NarrativeGenerator.analyze(mockBuffer);
console.log("Result:\n" + result);

// --- Assertions ---
let pass = true;
if (result.includes("Avg Density: 2.17")) console.log("PASS: Avg Density correct."); else { console.error("FAIL: Avg Density mismatch."); pass = false; }
// Peak should be 3.5
if (result.includes("Peak: 3.50")) console.log("PASS: Peak Density correct."); else { console.error("FAIL: Peak wrong."); pass = false; }
// Overloads: 3 - 0 = 3
if (result.includes("New Overloads: 3")) console.log("PASS: Overloads correct."); else { console.error("FAIL: Overloads wrong."); pass = false; }
// Dominant: loop (3 vs 1 wave)
if (result.includes("Dominant Pattern: loop")) console.log("PASS: Dominant Pattern correct."); else { console.error("FAIL: Dominant Pattern wrong."); pass = false; }

if (pass) console.log("S5 Narrative Verified.");
else process.exit(1);
