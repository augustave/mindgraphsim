const fs = require('fs');
const path = require('path');

// Mock Context
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

// Mock Global Environment
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
global.requestAnimationFrame = () => { };

// Load engine
const enginePath = '/Users/taoconrad/Documents/GitHub 4/mindgraphsim/mgs-engine.js';
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose globals
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/let hudMetrics =/g, 'global.hudMetrics =');
engineCode = engineCode.replace(/let currentContext =/g, 'global.currentContext =');
engineCode = engineCode.replace(/let physicsConfig =/g, 'global.physicsConfig =');

try {
    eval(engineCode);
} catch (e) {
    console.error("Error loading engine:", e);
}

// Test 1: API Existence
console.log('Test 1: API Existence');
if (typeof listProfiles === 'function' && typeof listFrames === 'function') {
    console.log('PASS: listProfiles and listFrames exist');
} else {
    console.error('FAIL: APIs missing');
}

// Test 2: Apply Profile
console.log('Test 2: Apply Profile');
const initialNoise = global.physicsConfig.noise.base_strength;
console.log('Initial Noise:', initialNoise);

applyProfile('adhd_scatter_focus');
const newNoise = global.physicsConfig.noise.base_strength;
console.log('ADHD Noise:', newNoise);

// Expect noise to increase (0.15 base * 1.4 scale = 0.21)
if (newNoise > initialNoise && Math.abs(newNoise - (0.15 * 1.4)) < 0.01) {
    console.log('PASS: Physics updated correctly for profile');
} else {
    console.error('FAIL: Physics update mismatch. Expected ~0.21, got', newNoise);
}

// Test 3: Apply Frame
console.log('Test 3: Apply Frame');
applyFrame('frame_conflict_mediation');
if (global.currentContext.frameId === 'frame_conflict_mediation') {
    console.log('PASS: Frame applied');
} else {
    console.error('FAIL: Frame not updated');
}

// Test 4: Density Calculation
console.log('Test 4: Metrics Density');
global.state.patterns = [1, 2, 3]; // Mock patterns
// Mock objects with properties needed for reduce
global.state.objects = Array(5).fill({ sensory: 0.5, stress: 0.1, activation: 0.5 });
updateHUDMetrics();
// density = 3/5 = 0.6. Status should be ... saturated or busy?
// Limit > 0.6 is saturated. 0.6 is busy.
// Wait, density is patterns.length / objects.length.
// Engine uses actual array length for objects.
updateHUDMetrics();
console.log('Metric Density:', global.state.metrics.patternDensity);
console.log('HUD Status:', global.hudMetrics.densityStatus);

if (global.hudMetrics.densityStatus === 'busy') {
    console.log('PASS: Density status is busy (0.6)');
} else {
    console.error('FAIL: Density status mismatch');
}
