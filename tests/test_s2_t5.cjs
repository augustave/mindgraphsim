const fs = require('fs');
const path = require('path');

// Mock Element
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
global.requestAnimationFrame = () => { }; // Disable loop

// Load engine
const enginePath = '/Users/taoconrad/Documents/GitHub 4/mindgraphsim/mgs-engine.js';
let engineCode = fs.readFileSync(enginePath, 'utf8');

// Expose internal state variables to global scope for testing
engineCode = engineCode.replace(/let state =/g, 'global.state =');
engineCode = engineCode.replace(/let patternIdCounter =/g, 'global.patternIdCounter =');
engineCode = engineCode.replace(/let hudMetrics =/g, 'global.hudMetrics =');

try {
    eval(engineCode);
} catch (e) {
    console.error("Error loading engine:", e);
    // Don't exit, might be a render error that we can ignore if state is loaded
}

// Ensure state is available
if (typeof global.state === 'undefined') {
    if (typeof state !== 'undefined') global.state = state;
    else {
        console.error("State not found!");
        process.exit(1);
    }
}

// Helper to reset state
function resetState() {
    global.state.objects = [];
    global.state.edges = [];
    global.state.patterns = [];
    global.state.step = 0;
    global.state.metrics = {};
    global.state.patternTimeline = [];
    global.patternIdCounter = 0;
}

// Test 1: Calculation Helper
console.log('Test 1: calculatePatternOverlap');
// calculatePatternOverlap should be global since it's a function declaration
const s1 = calculatePatternOverlap(['a', 'b', 'c'], ['b', 'c', 'd']);
if (Math.abs(s1 - 2 / 4) < 0.001) console.log('PASS: Overlap is 0.5');
else console.error('FAIL: Overlap expected 0.5, got', s1);

// Test 2: Loop Deduplication
console.log('Test 2: Loop Deduplication');
resetState();
// Create a loop of 3 nodes: A-B-C-A
const nodes = ['A', 'B', 'C'];
nodes.forEach(id => global.state.objects.push({ id, label: id, x: 0, y: 0, activation: 0.5, activationHistory: Array(20).fill(0.5) }));
global.state.edges.push({ sourceId: 'A', targetId: 'B', severed: false });
global.state.edges.push({ sourceId: 'B', targetId: 'C', severed: false });
global.state.edges.push({ sourceId: 'C', targetId: 'A', severed: false });

// Simulate oscillation
const oscillating = [0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4, 0.8, 0.4];
global.state.objects[0].activationHistory = oscillating;

detectPatterns();
const count1 = global.state.patterns.length;
console.log('Patterns after run 1:', count1);

detectPatterns();
const count2 = global.state.patterns.length;
console.log('Patterns after run 2:', count2);

if (count1 === 1 && count2 === 1) {
    console.log('PASS: Loop deduplicated (count stayed 1)');
} else {
    console.error(`FAIL: Expected 1 loop, got ${count1} then ${count2}`);
}

// Test 3: Density Metric
console.log('Test 3: Density Metric');
updateHUDMetrics();
const density = global.state.metrics.patternDensity;
console.log('Density:', density);
if (Math.abs(density - 1 / 3) < 0.001) console.log('PASS: Density is 1/3');
else console.error('FAIL: Expected 0.333, got', density);

// Test 4: Near-duplicate Loop (Overlap > 0.7)
console.log('Test 4: Near-duplicate Loop');
resetState();
global.state.patterns.push({
    id: 'p_existing',
    type: 'loop',
    name: 'Existing Loop',
    nodeIds: ['A', 'B', 'C', 'D'],
    age: 100,
    energy: 0.5
});

// Setup Node A to detect a loop with A, B, C
global.state.objects.push({ id: 'A', label: 'A', activation: 0.5, activationHistory: oscillating });
global.state.objects.push({ id: 'B', label: 'B', activation: 0.5, activationHistory: [] });
global.state.objects.push({ id: 'C', label: 'C', activation: 0.5, activationHistory: [] });
global.state.objects.push({ id: 'D', label: 'D', activation: 0.5, activationHistory: [] });

// Connect A-B-C-A
global.state.edges.push({ sourceId: 'A', targetId: 'B', severed: false });
global.state.edges.push({ sourceId: 'B', targetId: 'C', severed: false });
global.state.edges.push({ sourceId: 'C', targetId: 'A', severed: false });

detectPatterns();

console.log('Patterns count:', global.state.patterns.length);
if (global.state.patterns.length === 1 && global.state.patterns[0].nodeIds.length === 4) {
    console.log('PASS: High overlap loop merged.');
} else {
    console.log('FAIL: Expected merge. Count:', global.state.patterns.length, 'NodeIds:', global.state.patterns[0]?.nodeIds);
}
