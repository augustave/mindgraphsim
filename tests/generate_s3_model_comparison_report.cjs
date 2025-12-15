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
const enginePath = path.join(__dirname, '../dist/mgs-engine.js');
const engineCode = fs.readFileSync(enginePath, 'utf8');

try {
    eval(engineCode);
    Object.assign(global, global.document.defaultView || global.window);
} catch (e) { console.error("Error loading engine:", e); process.exit(1); }

// Access exposed globals
const engineInputAdapter = window.InputAdapter;
const engineApplyModel = window.applyModel;
const engineModelRegistry = window.MODEL_REGISTRY;

if (!engineInputAdapter || !engineApplyModel || !engineModelRegistry) {
    console.error("Missing required engine internals (InputAdapter, applyModel, MODEL_REGISTRY). Verification failed.");
    process.exit(1);
}

// --- Parse Input Script (Manual YAML parsing for now since we don't have yaml lib available in environment easily) ---
// Actually, we can just use regex or assume simple structure, or fallback to JSON if YAML is too hard without deps.
// The stress_test.yaml is simple. Let's write a mini-parser or just require us to provide JSON for the harness.
// For S3-T1 we wrote YAML. `stress_test.yaml`.
// Simplest way: Read file, simple regex to parse `at_step:`, `target:`, etc.

function parseYamlEvents(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const events = [];
    let currentEvent = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        if (trimmed.startsWith('- at_step:')) {
            if (currentEvent) events.push(currentEvent);
            currentEvent = {};
            const val = trimmed.split(':')[1].trim();
            currentEvent.at_step = parseInt(val, 10);
        } else if (currentEvent) {
            const parts = trimmed.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let val = parts[1].trim();
                // Unquote string
                if ((val.startsWith('"') && val.endsWith('"'))) val = val.slice(1, -1);

                if (key === 'magnitude' || (key === 'at_step' && !currentEvent.at_step)) {
                    val = parseFloat(val);
                }
                currentEvent[key] = val;
            }
        }
    });
    if (currentEvent) events.push(currentEvent);
    return events;
}


// --- CLI Args ---
const args = process.argv.slice(2);
const getArg = (key, defaultVal) => {
    const idx = args.indexOf(key);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};
const hasArg = (key) => args.includes(key);

const SCENE_ID = getArg('--scene', 'conflict_resolution');
const PROFILE_ID = getArg('--profile', 'open_neutral');
const FRAME_ID = getArg('--frame', 'frame_open_exploration');
const STEPS = parseInt(getArg('--steps', '500'), 10);
const WRITE_FILE = hasArg('--write');
const INPUT_SCRIPT = path.join(__dirname, 'scenarios/stress_test.yaml');

// --- Harness Logic ---
function runSteps(count) {
    const dt = 0.016;
    for (let i = 0; i < count; i++) {
        // InputAdapter hook is inside animate(), but here we run custom loop.
        // We MUST call InputAdapter.processStep explicitly if not using animate()!
        // mgs-engine.js animate() calls it. This harness calls runSteps() which mimics loop.
        engineInputAdapter.processStep(Math.round(state.step)); // Use round to avoid float issues? step is integer.

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

console.log(`Running S3 Model Comparison Harness`);
console.log(`Scene: ${SCENE_ID}, Profile: ${PROFILE_ID}, Script: ${path.basename(INPUT_SCRIPT)}`);

// Parse Inputs
const inputEvents = parseYamlEvents(INPUT_SCRIPT);
console.log(`Loaded ${inputEvents.length} input events.`);


let results = {};

engineModelRegistry.forEach(model => {
    console.log(`testing model: ${model.id}...`);
    // Reset
    loadScene(SCENE_ID);
    applyProfile(PROFILE_ID);
    applyFrame(FRAME_ID);
    state.step = 0; // Reset step explicitly

    // Apply Model (AFTER profile)
    engineApplyModel(model.id);

    // Load Events
    engineInputAdapter.loadEvents(inputEvents);

    // Run
    runSteps(STEPS);

    // Collect Metrics
    const pats = state.patterns.length;
    const over = state.overloads;
    const dens = state.metrics.patternDensity;
    // Avg Pattern Lifetime
    // ... calculate from patternTimeline ...

    results[model.id] = {
        density: parseFloat(dens.toFixed(2)),
        patterns: pats,
        overloads: over,
        status: (over === 0 && dens < 5.0 && pats <= 30) ? 'PASS' : 'FAIL'
    };
});

// Best Fit Selection
// 1. Filter PASS
// 2. Min Overloads (should be 0)
// 3. Min Density
// 4. Tie-break: Less patterns, then 'baseline'
const candidates = Object.keys(results).filter(k => results[k].status === 'PASS');
let winner = candidates[0];

if (candidates.length > 1) {
    // Sort by density, then patterns
    candidates.sort((a, b) => {
        const dDens = results[a].density - results[b].density;
        if (Math.abs(dDens) > 0.01) return dDens;

        const dPats = results[a].patterns - results[b].patterns;
        if (dPats !== 0) return dPats;

        // Bias towards baseline if tied
        if (a === 'baseline') return -1;
        if (b === 'baseline') return 1;
        return 0;
    });
    winner = candidates[0];
} else if (candidates.length === 0) {
    winner = null; // No winner found
}


console.log('\n--- Results ---');
console.table(results);
console.log(`Winner: ${winner}`);

// YAML Output
const yamlOutput = `mindgraphsim_s3_model_comparison:
  engine_version: "v0.9-S3"
  scene_id: "${SCENE_ID}"
  profile_id: "${PROFILE_ID}"
  input_script: "${path.basename(INPUT_SCRIPT)}"
  models_tested: [${engineModelRegistry.map(m => `"${m.id}"`).join(', ')}]
  winner_model_id: "${winner}"
  results:
${Object.keys(results).map(key => {
    const r = results[key];
    return `    ${key}:
      density: ${r.density}
      patterns: ${r.patterns}
      overloads: ${r.overloads}
      status: ${r.status}`;
}).join('\n')}
`;

if (WRITE_FILE) {
    const outPath = path.join(__dirname, '../docs/mindgraphsim_s3_model_comparison.yaml');
    fs.writeFileSync(outPath, yamlOutput);
    console.log(`Report written to ${outPath}`);
} else {
    // console.log(yamlOutput); // Already showed table
}
