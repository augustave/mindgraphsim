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

// Replacements to expose internals
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/let physicsConfig =/g, 'global.physicsConfig =');
// InputAdapter is exposed via window.InputAdapter in the engine file


try { eval(engineCode); } catch (e) { console.error("Error loading engine:", e); process.exit(1); }

const InputAdapter = window.InputAdapter || global.InputAdapter;

if (!InputAdapter) {
    console.error("InputAdapter not found!");
    process.exit(1);
}

// --- Test Case ---
console.log("Testing InputAdapter...");

// 1. Initial State
// physicsConfig has nested noise.base_strength
const initNoise = physicsConfig.noise.base_strength;
console.log(`Initial Noise: ${initNoise}`);

// 2. Load Events
const events = [
    { at_step: 10, target: 'ambient', selector: null, channel: 'noise.base_strength', mode: 'add', magnitude: 0.5 },
    { at_step: 20, target: 'ambient', selector: null, channel: 'noise.base_strength', mode: 'set', magnitude: 0.1 }
];
InputAdapter.loadEvents(events);

// 3. Step 0 (Should be no change)
InputAdapter.processStep(0);
if (Math.abs(physicsConfig.noise.base_strength - initNoise) > 0.001) {
    console.error(`FAIL: specific step 0 changed noise prematurely.`);
}

// 4. Step 10 (Should add 0.5)
InputAdapter.processStep(10);
const expectedNoise = initNoise + 0.5;
if (Math.abs(physicsConfig.noise.base_strength - expectedNoise) < 0.001) {
    console.log(`PASS: Step 10 increased noise to ${physicsConfig.noise.base_strength}`);
} else {
    console.error(`FAIL: Step 10 noise mismatch. Got ${physicsConfig.noise.base_strength}, expected ${expectedNoise}`);
}

// 5. Step 20 (Should set to 0.1)
InputAdapter.processStep(20);
if (Math.abs(physicsConfig.noise.base_strength - 0.1) < 0.001) {
    console.log(`PASS: Step 20 set noise to ${physicsConfig.noise.base_strength}`);
} else {
    console.error(`FAIL: Step 20 noise mismatch. Got ${physicsConfig.noise.base_strength}, expected 0.1`);
}

console.log("InputAdapter Verification Complete.");

