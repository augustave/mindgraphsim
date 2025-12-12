const fs = require('fs');
const path = require('path');

// Mock Context & Canvas (Reused)
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
global.requestAnimationFrame = (cb) => { };

// Load engine
const enginePath = '/Users/taoconrad/Documents/GitHub 4/mindgraphsim/mgs-engine.js';
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose globals
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/let patternIdCounter =/g, 'global.patternIdCounter =');
engineCode = engineCode.replace(/let hudMetrics =/g, 'global.hudMetrics =');
engineCode = engineCode.replace(/let currentContext =/g, 'global.currentContext =');
engineCode = engineCode.replace(/let physicsConfig =/g, 'global.physicsConfig =');

try {
    eval(engineCode);
} catch (e) {
    console.error("Error loading engine:", e);
}

// Redirect Console
const originalLog = console.log;
console.log = function (...args) {
    // Relaxed logging for debug
    originalLog.apply(console, args);
};

// HELPER: Run a fixed number of steps
function runSteps(count) {
    const dt = 0.016;
    for (let i = 0; i < count; i++) {
        integratePhysics(dt);
        applySemanticPositionalBias();
        applyPatternInfluence();
        updateEnergyStress(dt);
        ambientStep(dt);
        activationStep(dt);
        if (i % 5 === 0) detectPatterns();
        state.step++;
    }
    updateHUDMetrics();
}

// TESTS
const combostest = [
    { p: 'open_neutral', f: 'frame_open_exploration', name: 'Default Open' },
    { p: 'adhd_scatter_focus', f: 'frame_brainstorm_session', name: 'ADHD / Brainstorm' },
    { p: 'autistic_sensory_sheet', f: 'frame_conflict_mediation', name: 'Autistic / Conflict' },
    { p: 'meditative_slow_field', f: 'frame_meditative_field', name: 'Meditative / Meditative' }
];

console.log("=== S2.5 Refinement: Multi-Combo Regression Test ===");
let allPass = true;

combostest.forEach(combo => {
    console.log(`\nTesting Combo: ${combo.name} [${combo.p} + ${combo.f}]`);

    // Reset and Apply
    // We can use loadScene to reset state
    loadScene('conflict_resolution');
    applyProfile(combo.p);
    applyFrame(combo.f);

    // Run 500 steps (enough for stability check without waiting forever)
    runSteps(500);

    // Check Metrics
    const patterns = state.patterns.length;
    const overloads = state.overloads;
    const density = state.metrics.patternDensity;
    const status = hudMetrics.densityStatus;

    console.log(`  Patterns: ${patterns}`);
    console.log(`  Overloads: ${overloads}`);
    console.log(`  Density: ${density.toFixed(2)} (${status})`);

    // Assertions
    if (overloads > 0) {
        console.log("  FAIL: Overloads detected.");
        allPass = false;
    }
    if (patterns < 0 || patterns > 20) {
        console.log("  FAIL: Pattern count out of bounds.");
        console.log("  DEBUG: Pattern List:");
        state.patterns.forEach(p => console.log(`     - ${p.type} (${p.name}) [Str:${(p.strength || 0).toFixed(2)}]`));
        allPass = false;
    }
    if (density > 5.0) {
        console.log("  FAIL: Density exploded.");
        allPass = false;
    }

    // Context check
    const ctx = getCurrentContext();
    if (ctx.profileId !== combo.p || ctx.frameId !== combo.f) {
        console.log("  FAIL: Context mismatch.");
        allPass = false;
    }

    if (allPass) console.log("  PASS");
});

if (allPass) console.log("\nALL REGRESSION TESTS PASSED");
else console.log("\nSOME TESTS FAILED");

// Restore console
console.log = originalLog;
