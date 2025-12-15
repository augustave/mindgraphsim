import {
    loadScene,
    applyProfile,
    applyFrame,
    state,
    physicsConfig,
    hudMetrics,
    InputAdapter,
    integratePhysics,
    applySemanticPositionalBias,
    applyPatternInfluence,
    updateEnergyStress,
    ambientStep,
    activationStep,
    detectPatterns,
    updateHUDMetrics,
    listModels,
    applyModel,
    getCurrentContext,
    listFrames,
    drawGraph,
    resize
} from './engine';
import { listProfiles } from './profiles';

// Type augmentations for Window if needed for debugging
declare global {
    interface Window {
        state: any;
        physicsConfig: any;
        hudMetrics: any;
        lab: any; // Namespace for our lab controls
    }
}

// State for the Lab View
let isRunning = false;
let animationFrameId: number | null = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initLabUI();
});

function initLabUI() {
    console.log("Initializing v1 Lab UI...");

    // 1. Setup Canvas & Window
    window.addEventListener('resize', resize);
    resize(); // Initial resize

    // 2. Initialize Engine Defaults
    loadScene('conflict_resolution');
    applyProfile('autistic_intense_connectivity'); // Default per index.html
    applyFrame('frame_open_exploration');

    // 3. UI Bindings
    setupControls();
    setupDropdowns();

    // 4. Debugging Hooks
    window.state = state;
    window.physicsConfig = physicsConfig;
    window.hudMetrics = hudMetrics;
    window.lab = {
        start: () => { isRunning = true; play(); },
        stop: () => { isRunning = false; },
        step: () => stepSimulation(1)
    };

    // 5. Start Loop
    play();
}

function play() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    const loop = () => {
        if (isRunning) {
            stepSimulation(1);
        } else {
            // Even if paused, we draw
            drawGraph();
        }
        updateDOMHUD();
        animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
}

function stepSimulation(count: number = 1) {
    for (let i = 0; i < count; i++) {
        // Standard Physics Loop from engine integration
        // dt = 0.016 (approx 60fps)
        const dt = 0.016;

        integratePhysics(dt);
        applySemanticPositionalBias();
        applyPatternInfluence();
        updateEnergyStress(dt);
        ambientStep(dt);
        activationStep(dt);

        // Pattern detection every 5 steps
        if (state.step % 5 === 0) detectPatterns();

        // Update engine metrics
        adjustPhysicsForMetrics(); // minimal dynamic adjustment
        updateHUDMetrics();

        state.step++;
    }
}

// Basic dynamic physics adjustments closer to engine logic
// In a full migration, this logic might live in engine's `animate` or similar.
function adjustPhysicsForMetrics() {
    // Placeholder to match 'mgs-engine.js' behavior if it had loop logic
    // For now, engine functions called above cover most logic.
}

function setupControls() {
    // Top Toolbar Buttons
    bindClick('btn-reset', () => {
        loadScene('conflict_resolution');
        state.step = 0;
        drawGraph();
        updateDOMHUD();
    });

    bindClick('btn-noise', () => {
        InputAdapter.applyEvent({
            target: 'node', selector: '*', channel: 'activation', mode: 'add', magnitude: 0.3
        });
        drawGraph();
    });

    bindClick('btn-catalog', () => {
        const modal = document.getElementById('catalog-modal');
        if (modal) modal.classList.add('open');
    });

    // Timeline Controls
    bindClick('btn-play', (e: Event) => {
        isRunning = !isRunning;
        (e.target as HTMLElement).classList.toggle('active', isRunning);
        if (isRunning) play();
    });

    bindClick('btn-step', () => {
        isRunning = false;
        stepSimulation(1);
        drawGraph();
        updateDOMHUD();
    });

    bindClick('btn-forward', () => {
        isRunning = false;
        stepSimulation(10); // Standard quick step
        drawGraph();
        updateDOMHUD();
    });

    bindClick('btn-back', () => {
        // Step back not implemented fully in v1 lab without recorder replay
        console.warn("Step back not implemented in engine v1 yet");
    });
}

function bindClick(id: string, handler: (e: Event) => void) {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
}

function setupDropdowns() {
    // Scene Select
    const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;
    if (sceneSelect) {
        sceneSelect.onchange = (e) => {
            loadScene((e.target as HTMLSelectElement).value);
            drawGraph();
        };
    }

    // Profile Select
    const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;
    if (profileSelect) {
        profileSelect.onchange = (e) => {
            const val = (e.target as HTMLSelectElement).value;
            // Map simple values to IDs if needed, or assume value matches ID
            // Legacy dropdowns used the short names: general, autistic, adhd, meditative
            // Engine profiles.ts uses: open_neutral, autistic_intense_connectivity, adhd_scatter_focus, meditative_slow_field
            let profileId = val;
            if (val === 'general') profileId = 'open_neutral';
            if (val === 'autistic') profileId = 'autistic_intense_connectivity';
            if (val === 'adhd') profileId = 'adhd_scatter_focus';
            if (val === 'meditative') profileId = 'meditative_slow_field';

            applyProfile(profileId);
            updateDOMHUD();
        };
    }

    // Model Select
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    if (modelSelect) {
        const models = listModels();
        modelSelect.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = m.label;
            modelSelect.appendChild(opt);
        });
        modelSelect.onchange = (e) => {
            applyModel((e.target as HTMLSelectElement).value);
            updateDOMHUD();
        };
    }

    // Frame Select
    const frameSelect = document.getElementById('frame-select') as HTMLSelectElement;
    if (frameSelect) {
        const frames = listFrames();
        console.log("Initializing Frame Select with:", frames);
        frameSelect.innerHTML = '';
        frames.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.innerText = f.label;
            frameSelect.appendChild(opt);
        });

        frameSelect.onchange = (e) => {
            console.log("Frame changed to:", (e.target as HTMLSelectElement).value);
            applyFrame((e.target as HTMLSelectElement).value);
            updateDOMHUD();
        };
        // Set default
        frameSelect.value = 'frame_open_exploration';
    }
}

function updateDOMHUD() {
    // Update stats
    // setText('stat-step', state.step.toString()); // Removed from HTML
    const scrubberLabel = document.getElementById('scrubber-label');
    if (scrubberLabel) scrubberLabel.textContent = `Step ${state.step}`;

    setText('stat-objects', state.objects.length.toString());
    setText('stat-patterns', state.patterns.length.toString());
    setText('stat-overloads', state.overloads.toString());

    // Calculate simple metrics for display
    let totalAct = 0;
    state.objects.forEach((o: any) => totalAct += o.activation);
    const avgAct = state.objects.length ? (totalAct / state.objects.length).toFixed(2) : "0.00";
    setText('stat-activation', avgAct);

    // Density
    const density = (state.metrics as any)?.patternDensity || 0;
    setText('stat-density', density.toFixed(2));

    // Context Logs
    const ctx = getCurrentContext();
    setText('stat-profile', ctx.profileId);
    setText('stat-frame', ctx.frameId);
}

function setText(id: string, val: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
