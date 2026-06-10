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

// Window typing lives in src/global.d.ts (single source of truth).

// State for the Lab View
let isRunning = false;
let animationFrameId: number | null = null;

type ToastKind = 'info' | 'success' | 'warning' | 'error';
let toastTimer: number | null = null;

type ExplainableMetrics = {
    cognitiveLoad: number;
    coherence: number;
    novelty: number;
};

const EXPLAINABLE_METRICS_CONFIG = {
    activeActivationThreshold: 0.6,
    stressThreshold: 0.6
};

type MaterialLawV1 = {
    label: string;
    conductivity: number;
    viscosity: number;
    brittleness: number;
    noiseDamping: number;
};

const MATERIAL_LAWS_V1: Record<string, MaterialLawV1> = {
    gold: { label: 'Gold (Core)', conductivity: 0.75, viscosity: 0.55, brittleness: 0.25, noiseDamping: 0.15 },
    iron: { label: 'Iron (Position)', conductivity: 0.45, viscosity: 0.75, brittleness: 0.35, noiseDamping: 0.1 },
    copper: { label: 'Copper (Notes)', conductivity: 0.95, viscosity: 0.2, brittleness: 0.85, noiseDamping: 0.05 },
    titanium: { label: 'Titanium (Anchor)', conductivity: 0.35, viscosity: 0.9, brittleness: 0.2, noiseDamping: 0.15 },
    silver: { label: 'Silver', conductivity: 0.85, viscosity: 0.45, brittleness: 0.3, noiseDamping: 0.1 },
    quartz: { label: 'Quartz (Sources)', conductivity: 0.25, viscosity: 0.95, brittleness: 0.15, noiseDamping: 0.35 },
    tourmaline: { label: 'Tourmaline', conductivity: 0.35, viscosity: 0.7, brittleness: 0.55, noiseDamping: 0.2 },
    fluorite: { label: 'Fluorite', conductivity: 0.4, viscosity: 0.65, brittleness: 0.45, noiseDamping: 0.2 },
    carbon: { label: 'Carbon', conductivity: 0.6, viscosity: 0.5, brittleness: 0.4, noiseDamping: 0.2 },
    mycelium: { label: 'Mycelium (Synthesis)', conductivity: 0.55, viscosity: 0.8, brittleness: 0.25, noiseDamping: 0.6 },
    nitrogen: { label: 'Nitrogen', conductivity: 0.5, viscosity: 0.6, brittleness: 0.35, noiseDamping: 0.3 },
    oxygen: { label: 'Oxygen', conductivity: 0.5, viscosity: 0.55, brittleness: 0.3, noiseDamping: 0.25 }
};

const MATERIAL_LAW_PRESETS_V1: Record<
    string,
    { id: string; label: string; description: string; overrides: Partial<Record<string, Partial<MaterialLawV1>>> }
> = {
    copper_fast_brittle: {
        id: 'copper_fast_brittle',
        label: 'Copper Fast / Brittle',
        description: 'Faster propagation, higher overload risk (default PoC story).',
        overrides: { copper: { conductivity: 0.98, brittleness: 0.9, viscosity: 0.18, noiseDamping: 0.03 } }
    },
    copper_stable: {
        id: 'copper_stable',
        label: 'Copper Stable',
        description: 'Slower propagation, lower overload risk, more damping.',
        overrides: { copper: { conductivity: 0.55, brittleness: 0.25, viscosity: 0.55, noiseDamping: 0.2 } }
    }
};

let activeMaterialLawPresetId: keyof typeof MATERIAL_LAW_PRESETS_V1 = 'copper_fast_brittle';
type MaterialLensMode = 'none' | 'conductivity' | 'viscosity' | 'brittleness' | 'noiseDamping';
let materialLensMode: MaterialLensMode = 'none';

let comparisonRunning = false;

const MATERIALS_VIZ_V1: Record<
    string,
    { category: 'metal' | 'mineral' | 'bio'; color: string; mass: number; C: number }
> = {
    gold: { category: 'metal', color: '#ffd700', C: 0.9, mass: 0.92 },
    iron: { category: 'metal', color: '#8b8b8b', C: 0.6, mass: 0.85 },
    copper: { category: 'metal', color: '#b87333', C: 0.96, mass: 0.76 },
    titanium: { category: 'metal', color: '#878787', C: 0.5, mass: 0.88 },
    silver: { category: 'metal', color: '#c0c0c0', C: 0.8, mass: 0.9 },
    quartz: { category: 'mineral', color: '#e8e8e8', C: 0.7, mass: 0.77 },
    tourmaline: { category: 'mineral', color: '#ff85c1', C: 0.7, mass: 0.68 },
    fluorite: { category: 'mineral', color: '#b38adb', C: 0.65, mass: 0.7 },
    carbon: { category: 'bio', color: '#5a5a5a', C: 0.95, mass: 0.89 },
    mycelium: { category: 'bio', color: '#5cff9d', C: 0.98, mass: 0.77 },
    nitrogen: { category: 'bio', color: '#4dd9e0', C: 0.8, mass: 0.72 },
    oxygen: { category: 'bio', color: '#7ab3ff', C: 0.85, mass: 0.75 }
};

let lastExplainable: {
    patternCounts: Record<string, number>;
    activeCentroid: { x: number; y: number } | null;
} = { patternCounts: {}, activeCentroid: null };

let pocDemo: { running: boolean; intervalId: number | null; remainingSteps: number } = {
    running: false,
    intervalId: null,
    remainingSteps: 0
};

type InterventionMarker = { step: number; label: string; kind: ToastKind };
const interventionMarkers: InterventionMarker[] = [];

type ShareState = {
    scene?: string;
    profile?: string;
    frame?: string;
    model?: string;
    materialPreset?: string;
    lens?: MaterialLensMode;
    seed?: number;
    autostart?: 'demo' | 'compare' | 'none';
    layout?: 'concept_forge';
};

let restoringFromURL = false;
let shareSeed: number | null = null;
let seededRandomRestore: (() => void) | null = null;
let lastBottleneck: { id: string | null; step: number } = { id: null, step: -9999 };

function setParam(q: URLSearchParams, key: string, value: string | undefined) {
    if (!value) q.delete(key);
    else q.set(key, value);
}

function buildShareURL(extra: Partial<ShareState> = {}): string {
    const ctx = getCurrentContext();
    const url = new URL(window.location.href);
    const q = url.searchParams;

    const next: ShareState = {
        scene: q.get('scene') || undefined,
        profile: ctx.profileId,
        frame: ctx.frameId,
        model: (ctx as any).modelId || 'baseline',
        materialPreset: activeMaterialLawPresetId,
        lens: materialLensMode,
        seed: typeof shareSeed === 'number' ? shareSeed : q.get('seed') ? Number(q.get('seed')) : undefined,
        autostart: (q.get('autostart') as any) || 'none',
        layout: (q.get('layout') as any) || undefined,
        ...extra
    };

    setParam(q, 'scene', next.scene);
    setParam(q, 'profile', next.profile);
    setParam(q, 'frame', next.frame);
    setParam(q, 'model', next.model);
    setParam(q, 'materialPreset', next.materialPreset);
    setParam(q, 'lens', next.lens && next.lens !== 'none' ? next.lens : undefined);
    setParam(q, 'layout', next.layout);
    setParam(q, 'autostart', next.autostart && next.autostart !== 'none' ? next.autostart : undefined);
    if (typeof next.seed === 'number' && Number.isFinite(next.seed)) setParam(q, 'seed', String(next.seed));

    url.search = q.toString();
    return url.toString();
}

function writeShareStateToURL(extra: Partial<ShareState> = {}) {
    if (restoringFromURL) return;
    const url = buildShareURL(extra);
    window.history.replaceState({}, '', url);
}

function startSeededRandom(seed: number) {
    if (seededRandomRestore) seededRandomRestore();
    shareSeed = seed;

    const original = Math.random;
    // @ts-ignore override for deterministic runs
    Math.random = mulberry32(seed);
    seededRandomRestore = () => {
        // @ts-ignore restore
        Math.random = original;
        seededRandomRestore = null;
    };
}

function stopSeededRandom() {
    if (seededRandomRestore) seededRandomRestore();
    seededRandomRestore = null;
}

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
    // Kick the field into motion on load (short burst only): ensures first paint shows a live graph,
    // non-zero HUD metrics, and avoids the "static black box" feel without starting an infinite loop.
    stepSimulation(12);
    drawGraph();
    updateDOMHUD();

    injectLabPolishStyles();
    ensureCatalogModalScaffold();
    ensureRecorderHint();
    ensureExportControls();
    ensureExplainabilityPanels();
    ensurePoCDemoControls();
    ensureMaterialLensControls();
    ensureShareControls();

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

    // 6. Restore from share link (optional)
    tryRestoreFromURL();
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

        applyMaterialLawLayer();
        captureRecorderFrameIfEnabled();

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
        openCatalogModal();
    });

    // Timeline Controls
    bindClick('btn-play', (e: Event) => {
        // If the engine's ReplaySystem entered replay (via scrubber), play returns to live mode.
        const modeBadge = document.getElementById('mode-badge');
        if (modeBadge?.classList.contains('replay') && (window as any).ReplaySystem?.exit) {
            (window as any).ReplaySystem.exit();
            isRunning = true;
            (e.target as HTMLElement).classList.toggle('active', isRunning);
            play();
            return;
        }
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

    const btnRecord = document.getElementById('btn-record');
    if (btnRecord) {
        btnRecord.title = `Record (keeps last ${getRecorderCapacity()} frames)`;
        btnRecord.addEventListener(
            'click',
            () => {
                // Engine binds this too; run in capture phase so we can read "wasRecording"
                // before the engine toggles the recorder state.
                const recorder = (window as any).Recorder;
                if (!recorder) return;

                const wasRecording = Boolean(recorder.recording);
                if (!wasRecording) {
                    showToast(`Recording last ${getRecorderCapacity()} frames`, 'info', 2000);
                    appendEventLog(`Recording started (last ${getRecorderCapacity()} frames)`, 'info');
                } else {
                    appendEventLog(`Recording stopped (${recorder.buffer?.length ?? 0} frames)`, 'info');
                }
                updateRecorderHint();
            },
            true
        );
    }
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
            const sceneId = (e.target as HTMLSelectElement).value;
            loadScene(sceneId);
            writeShareStateToURL({ scene: sceneId, layout: undefined });
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
            writeShareStateToURL({ profile: profileId });
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
            writeShareStateToURL({ model: (e.target as HTMLSelectElement).value });
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
            const frameId = (e.target as HTMLSelectElement).value;
            applyFrame(frameId);
            updateDOMHUD();
            writeShareStateToURL({ frame: frameId });
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

	updateExplainabilityPanels();
	updateInterventionTimelineUI();
	updateMaterialLensUI();
	updateBottleneckUI();
}

function setText(id: string, val: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function injectLabPolishStyles() {
    const styleId = 'mgs-lab-polish-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .mgs-catalog-card.selected {
        border-color: #1a5cff;
        background: #1a1a2a;
        box-shadow: 0 0 0 1px rgba(26, 92, 255, 0.3) inset;
      }
      .mgs-catalog-card .mgs-selected-mark {
        float: right;
        color: #e6ff1a;
        font-weight: 700;
        font-size: 0.75rem;
        opacity: 0.95;
      }
      .mgs-catalog-footer {
        margin-top: 14px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #333;
      }
      .mgs-catalog-footer .secondary {
        background: #333;
      }
      .mgs-recorder-hint {
        font-size: 0.6rem;
        color: #888;
        margin-left: 6px;
        white-space: nowrap;
      }
      .mgs-toast {
        position: fixed;
        right: 12px;
        bottom: 12px;
        z-index: 3000;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid #2a2a2a;
        background: rgba(10, 10, 12, 0.92);
        color: #c4c4c4;
        font-size: 0.7rem;
        max-width: 360px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      }
      .mgs-toast.success { border-color: rgba(92, 255, 157, 0.35); }
      .mgs-toast.error { border-color: rgba(255, 77, 77, 0.45); }
      .mgs-toast.warning { border-color: rgba(230, 255, 26, 0.45); }
      .mgs-toast strong { color: #e6ff1a; }
      .mgs-export-group button {
        background: #333;
      }
      .mgs-export-group button:hover {
        background: #444;
      }
      .mgs-marker-row {
        position: relative;
        height: 10px;
        margin-top: 4px;
        opacity: 0.85;
      }
      .mgs-marker {
        position: absolute;
        top: 0;
        width: 2px;
        height: 10px;
        background: #e6ff1a;
      }
      .mgs-marker.info { background: #e6ff1a; }
      .mgs-marker.warning { background: #ffaa00; }
      .mgs-marker.error { background: #ff4d4d; }
      .mgs-marker.success { background: #5cff9d; }
      .mgs-timeline-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mgs-timeline-actions button {
        background: #333;
        color: #c4c4c4;
        border: 1px solid #333;
        padding: 4px 8px;
        border-radius: 3px;
        font-family: inherit;
        font-size: 0.7rem;
        cursor: pointer;
      }
      .mgs-timeline-actions button:hover { background: #444; }
    `;
    document.head.appendChild(style);
}

function ensureCatalogModalScaffold() {
    const overlay = document.getElementById('catalog-modal');
    if (!overlay) return;

    const modal = overlay.querySelector('.mgs-catalog-modal') as HTMLElement | null;
    if (!modal) return;

    if (modal.dataset.scaffolded === 'true') return;
    modal.dataset.scaffolded = 'true';

    modal.innerHTML = `
      <div class="mgs-catalog-header">
        <div>
          <h2>Catalog</h2>
          <p style="margin-top:6px; font-size:0.7rem; color:#888;">
            Active: <span id="catalog-active-profile" style="color:#e6ff1a"></span> ·
            <span id="catalog-active-frame" style="color:#e6ff1a"></span>
          </p>
        </div>
        <button class="mgs-close-btn" id="btn-close-catalog" aria-label="Close catalog">×</button>
      </div>
      <div class="mgs-catalog-content">
        <div class="mgs-catalog-section">
          <h3>Profiles</h3>
          <div id="catalog-profiles-list"></div>
        </div>
        <div class="mgs-catalog-section">
          <h3>Frames</h3>
          <div id="catalog-frames-list"></div>
        </div>
      </div>
      <div class="mgs-catalog-footer">
        <button id="btn-catalog-done" class="secondary">Done</button>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCatalogModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCatalogModal();
    });

    const btnClose = document.getElementById('btn-close-catalog');
    if (btnClose) btnClose.onclick = () => closeCatalogModal();
    const btnDone = document.getElementById('btn-catalog-done');
    if (btnDone) btnDone.onclick = () => closeCatalogModal();
}

function openCatalogModal() {
    ensureCatalogModalScaffold();
    renderCatalogModal();
    const overlay = document.getElementById('catalog-modal');
    overlay?.classList.add('open');
}

function closeCatalogModal() {
    const overlay = document.getElementById('catalog-modal');
    overlay?.classList.remove('open');
}

function renderCatalogModal() {
    const profilesList = document.getElementById('catalog-profiles-list');
    const framesList = document.getElementById('catalog-frames-list');
    if (!profilesList || !framesList) return;

    const ctx = getCurrentContext();
    const activeProfileEl = document.getElementById('catalog-active-profile');
    const activeFrameEl = document.getElementById('catalog-active-frame');
    if (activeProfileEl) activeProfileEl.textContent = ctx.profileId || 'unknown';
    if (activeFrameEl) activeFrameEl.textContent = ctx.frameId || 'unknown';

    profilesList.innerHTML = '';
    framesList.innerHTML = '';

    const profiles = listProfiles();
    profiles.forEach((p) => {
        const card = document.createElement('div');
        const selected = p.id === ctx.profileId;
        card.className = `mgs-catalog-card${selected ? ' selected' : ''}`;
        card.dataset.kind = 'profile';
        card.dataset.id = p.id;
        card.innerHTML = `
          <span class="mgs-selected-mark" aria-hidden="true">${selected ? '✓' : ''}</span>
          <h4>${escapeHtml(p.name)}</h4>
          <p>${escapeHtml(p.description || 'No description.')}</p>
          <span class="tag">${escapeHtml(p.category || 'profile')}</span>
        `;
        card.onclick = () => {
            applyProfile(p.id);
            updateDOMHUD();
            renderCatalogModal();
        };
        profilesList.appendChild(card);
    });

    const frames = listFrames();
    frames.forEach((f) => {
        const card = document.createElement('div');
        const selected = f.id === ctx.frameId;
        card.className = `mgs-catalog-card${selected ? ' selected' : ''}`;
        card.dataset.kind = 'frame';
        card.dataset.id = f.id;
        card.innerHTML = `
          <span class="mgs-selected-mark" aria-hidden="true">${selected ? '✓' : ''}</span>
          <h4>${escapeHtml(f.label)}</h4>
          <p>${escapeHtml(f.description || 'No description.')}</p>
        `;
        card.onclick = () => {
            applyFrame(f.id);
            updateDOMHUD();
            renderCatalogModal();
        };
        framesList.appendChild(card);
    });
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getRecorderCapacity(): number {
    const recorder = (window as any).Recorder;
    if (recorder && typeof recorder.capacity === 'number') return recorder.capacity;
    return 300;
}

function captureRecorderFrameIfEnabled() {
    const recorder = (window as any).Recorder;
    if (!recorder || !recorder.recording || typeof recorder.capture !== 'function') return;
    recorder.capture(state);

    const scrub = document.getElementById('scrubber') as HTMLInputElement | null;
    if (scrub) {
        const count = recorder.buffer?.length ?? 0;
        scrub.max = String(Math.max(0, count - 1));
    }
}

function ensureRecorderHint() {
    const recordBtn = document.getElementById('btn-record');
    if (!recordBtn) return;

    const existing = document.getElementById('recorder-hint');
    if (existing) {
        updateRecorderHint();
        return;
    }

    const hint = document.createElement('span');
    hint.id = 'recorder-hint';
    hint.className = 'mgs-recorder-hint';
    recordBtn.insertAdjacentElement('afterend', hint);
    updateRecorderHint();
}

function updateRecorderHint() {
    const hint = document.getElementById('recorder-hint');
    if (!hint) return;
    hint.textContent = `last ${getRecorderCapacity()} frames`;
}

function ensureExportControls() {
    const toolbar = document.querySelector('.mgs-toolbar');
    if (!toolbar) return;
    if (document.getElementById('btn-export-json')) return;

    const group = document.createElement('div');
    group.className = 'mgs-toolbar-group mgs-export-group';
    group.innerHTML = `
      <label>Export</label>
      <button id="btn-export-json" class="secondary" title="Download run JSON (records preferred)">Run JSON</button>
      <button id="btn-export-narrative" class="secondary" title="Download narrative summary (requires recording)">Narrative</button>
      <button id="btn-export-bundle" class="secondary" title="Download JSON + narrative + a PNG snapshot">Bundle</button>
    `;
    toolbar.appendChild(group);

    const btnJson = document.getElementById('btn-export-json');
    btnJson?.addEventListener('click', () => exportRunJSON());

    const btnNarr = document.getElementById('btn-export-narrative');
    btnNarr?.addEventListener('click', () => exportNarrative());

    const btnBundle = document.getElementById('btn-export-bundle');
    btnBundle?.addEventListener('click', () => exportBundle());
}

function exportRunJSON() {
    const recorder = (window as any).Recorder;
    const ctx = getCurrentContext();

    const framesCount = recorder?.buffer?.length ?? 0;
    const filename = 'mindgraphsim_run.json';
    const payload = recorder?.exportJSON && framesCount > 0
        ? recorder.exportJSON()
        : {
            meta: {
                date: new Date().toISOString(),
                mgs_version: typeof __MGS_VERSION__ !== 'undefined' ? __MGS_VERSION__ : 'unknown',
                git_sha: typeof __MGS_GIT_SHA__ !== 'undefined' ? __MGS_GIT_SHA__ : 'unknown',
                built_at: typeof __MGS_BUILT_AT__ !== 'undefined' ? __MGS_BUILT_AT__ : 'unknown',
                profile: ctx.profileId || 'unknown',
                model: (ctx as any).modelId || 'baseline',
                frame: ctx.frameId || 'unknown',
                step: state.step
            },
            live: serializeLiveStateForExport()
        };

    try {
        triggerDownload(JSON.stringify(payload, null, 2), 'application/json', filename);
        showToast(`Exported ${filename} (${framesCount > 0 ? `${framesCount} frames` : `${state.objects.length} objects`})`, 'success');
        appendEventLog(`[EXPORT] Saved ${filename}`, 'info');
    } catch (err) {
        console.error(err);
        showToast(`Export failed: ${filename}`, 'error');
        appendEventLog(`[EXPORT] Failed ${filename}`, 'error');
    }
}

function exportNarrative() {
    const recorder = (window as any).Recorder;
    const generator = (window as any).NarrativeGenerator;

    const framesCount = recorder?.buffer?.length ?? 0;
    if (!generator?.analyze || framesCount === 0) {
        showToast('Narrative export needs a recording (press ● to record).', 'warning');
        appendEventLog('[EXPORT] Narrative requires a recording', 'warning');
        return;
    }

    const text = String(generator.analyze(recorder.buffer));
    const filename = 'mindgraphsim_narrative.txt';
    triggerDownload(text, 'text/plain', filename);
    showToast(`Exported ${filename}`, 'success');
    appendEventLog(`[EXPORT] Saved ${filename}`, 'info');
}

function exportBundle() {
    exportRunJSON();
    exportNarrative();
    exportGraphPNG();
    showToast('Export bundle triggered (JSON + narrative + PNG)', 'success', 2000);
    appendEventLog('[EXPORT] Bundle triggered (JSON + narrative + PNG)', 'info');
}

function exportGraphPNG() {
    const canvas = document.getElementById('graph-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
        showToast('PNG export failed: canvas not found', 'error');
        appendEventLog('[EXPORT] PNG failed (no canvas)', 'error');
        return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'mindgraphsim_graph.png';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    appendEventLog('[EXPORT] Saved mindgraphsim_graph.png', 'info');
}

function triggerDownload(contents: string, mimeType: string, filename: string) {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function serializeLiveStateForExport() {
    const objects = state.objects.map((o: any) => ({
        id: o.id,
        x: o.x,
        y: o.y,
        activation: o.activation,
        mat: o.mat?.category ? { category: o.mat.category, color: o.mat.color } : o.mat,
        stress: o.stress,
        overloaded: o.overloaded,
        label: o.label,
        role: o.role
    }));

    const edges = state.edges.map((e: any) => ({
        sourceId: e.sourceId ?? e.source?.id,
        targetId: e.targetId ?? e.target?.id,
        weight: e.weight,
        stress: e.stress,
        severed: e.severed
    }));

    const patterns = state.patterns.map((p: any) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        nodeIds: (p.nodeIds || p.object_ids || (p.nodes || []).map((n: any) => n?.id).filter(Boolean)) || []
    }));

    return {
        step: state.step,
        overloads: state.overloads,
        metrics: state.metrics,
        objects,
        edges,
        patterns
    };
}

function showToast(message: string, kind: ToastKind = 'info', ttlMs: number = 1800) {
    let toast = document.getElementById('mgs-toast') as HTMLDivElement | null;
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mgs-toast';
        toast.className = 'mgs-toast';
        document.body.appendChild(toast);
    }

    toast.classList.remove('info', 'success', 'warning', 'error');
    toast.classList.add(kind);
    toast.textContent = message;

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast?.remove();
        toastTimer = null;
    }, ttlMs);
}

function appendEventLog(message: string, kind: ToastKind = 'info') {
    const log = document.getElementById('event-log');
    if (!log) return;

    const row = document.createElement('div');
    row.className = `mgs-event ${kind === 'error' ? 'overload' : kind === 'success' ? 'recovery' : kind === 'warning' ? 'pattern' : ''}`;
    row.innerHTML = `<span class="step">${state.step}</span>${escapeHtml(message)}`;
    log.insertAdjacentElement('afterbegin', row);
}

function ensureExplainabilityPanels() {
    const side = document.querySelector('.mgs-side');
    if (!side) return;
    if (document.getElementById('mgs-explainability')) return;

    const container = document.createElement('div');
    container.id = 'mgs-explainability';
    container.innerHTML = `
      <div class="mgs-card" id="mgs-card-explainable">
        <h3>Explainable Metrics</h3>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div class="mgs-hud-row"><span class="mgs-hud-label">Cognitive Load</span><span class="mgs-hud-value" id="metric-cognitive-load">0.00</span></div>
          <div class="mgs-hud-row"><span class="mgs-hud-label">Coherence</span><span class="mgs-hud-value" id="metric-coherence">0.00</span></div>
          <div class="mgs-hud-row"><span class="mgs-hud-label">Novelty</span><span class="mgs-hud-value" id="metric-novelty">0.00</span></div>
          <div style="font-size:0.6rem; color:#666; line-height:1.35;">
            Load = Σ max(0, stress − ${EXPLAINABLE_METRICS_CONFIG.stressThreshold.toFixed(1)}). Coherence = mean edge weight among active nodes. Novelty = change in patterns + motion.
          </div>
        </div>
      </div>
      <div class="mgs-card" id="mgs-card-material-laws">
        <h3>Material Laws (v1)</h3>
        <div id="material-laws-body" style="display:flex; flex-direction:column; gap:6px;"></div>
      </div>
    `;
    side.appendChild(container);
}

function ensureBottleneckPanel() {
    const side = document.querySelector('.mgs-side');
    if (!side) return;
    if (document.getElementById('mgs-card-bottleneck')) return;

    const card = document.createElement('div');
    card.id = 'mgs-card-bottleneck';
    card.className = 'mgs-card';
    card.innerHTML = `
      <h3>Bottleneck</h3>
      <div id="bottleneck-body" style="display:flex; flex-direction:column; gap:8px;"></div>
    `;
    side.insertBefore(card, side.firstChild);
}

function updateBottleneckUI() {
    ensureBottleneckPanel();
    const body = document.getElementById('bottleneck-body');
    if (!body) return;

    const bottleneck = computeBottleneck();
    if (!bottleneck) {
        body.innerHTML = `<div style="color:#888; font-size:0.65rem;">No nodes available.</div>`;
        return;
    }

    const { node, stress, activation, sensory } = bottleneck;
    const isScreaming = stress >= 0.95;

    if (isScreaming && (lastBottleneck.id !== node.id || state.step - lastBottleneck.step > 120)) {
        lastBottleneck = { id: node.id, step: state.step };
        appendEventLog(`Bottleneck: ${node.label} high stress (${stress.toFixed(2)})`, 'warning');
        showToast(`Bottleneck: ${node.label}`, 'warning', 1600);
    }

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; padding:8px; border:1px solid ${isScreaming ? 'rgba(255,77,77,0.35)' : '#1a1a1e'}; background:#0f0f12; border-radius:4px;">
        <div style="min-width:0;">
          <div style="color:${isScreaming ? '#ff4d4d' : '#c4c4c4'}; font-weight:700; font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(node.label)}
          </div>
          <div style="color:#666; font-size:0.6rem;">id: ${escapeHtml(node.id)} · material: ${escapeHtml(String(node.material || 'unknown'))}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#e6ff1a; font-weight:700; font-size:0.7rem;">stress ${stress.toFixed(2)}</div>
          <div style="color:#888; font-size:0.6rem;">act ${activation.toFixed(2)} · sens ${sensory.toFixed(2)}</div>
        </div>
      </div>

      <div style="color:#888; font-size:0.65rem; line-height:1.35;">
        High stress without being the loudest is a classic integration bottleneck (competing evidence / compression / sensory load).
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        <button id="btn-bn-split" class="secondary" style="flex:1; min-width:120px;">Split node</button>
        <button id="btn-bn-noise" class="secondary" style="flex:1; min-width:120px;">Lower noise</button>
        <button id="btn-bn-bridge" class="secondary" style="flex:1; min-width:120px;">Add bridge note</button>
      </div>
    `;

    document.getElementById('btn-bn-split')?.addEventListener('click', () => splitBottleneckNode(node.id));
    document.getElementById('btn-bn-noise')?.addEventListener('click', () => lowerAmbientNoise());
    document.getElementById('btn-bn-bridge')?.addEventListener('click', () => addBridgeNote());
}

function computeBottleneck(): { node: any; stress: number; activation: number; sensory: number } | null {
    if (!state.objects || state.objects.length === 0) return null;
    let max = state.objects[0];
    for (const o of state.objects) {
        if ((o.stress ?? 0) > (max.stress ?? 0)) max = o;
    }
    return {
        node: max,
        stress: Number(max.stress ?? 0),
        activation: Number(max.activation ?? 0),
        sensory: Number(max.sensory ?? 0)
    };
}

function lowerAmbientNoise() {
    const before = Number(state.ambient?.noise ?? 0);
    const next = Math.max(0.05, before - 0.15);
    state.ambient.noise = next;
    appendEventLog(`Intervention: lowered noise (${before.toFixed(2)} → ${next.toFixed(2)})`, 'info');
    showToast('Noise lowered', 'success', 1200);
    drawGraph();
    updateDOMHUD();
}

function splitBottleneckNode(nodeId: string) {
    const node = state.objects.find((o: any) => o.id === nodeId);
    if (!node) return;

    const newId = `${nodeId}_2`;
    if (state.objects.some((o: any) => o.id === newId)) {
        showToast('Split already applied', 'warning', 1200);
        return;
    }

    const clone = {
        ...node,
        id: newId,
        label: `${String(node.label || nodeId)} (split)`,
        x: (node.x ?? 0) + 55,
        y: (node.y ?? 0) + 30,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        stress: Math.max(0.05, (node.stress ?? 0) * 0.6),
        sensory: Math.max(0.1, (node.sensory ?? 0) * 0.7),
        activationHistory: []
    };

    if (String(node.label).toLowerCase().includes('note b') && !String(node.label).includes('B1')) {
        node.label = 'Note B1';
        clone.label = 'Note B2';
    }

    state.objects.push(clone);

    const incoming = state.edges.filter((e: any) => !e.severed && e.targetId === nodeId);
    incoming.forEach((e: any, idx: number) => {
        if (idx % 2 === 1) e.targetId = newId;
    });

    const outgoing = state.edges.filter((e: any) => !e.severed && e.sourceId === nodeId);
    outgoing.forEach((e: any) => {
        const eid = `split_${e.id}_${newId}`;
        state.edges.push({ ...e, id: eid, sourceId: newId });
    });

    state.edges.push(createLabEdge(`split_link_${nodeId}_${newId}`, nodeId, newId, 0.35));

    appendEventLog(`Intervention: split ${nodeId} into ${nodeId} + ${newId}`, 'success');
    showToast('Split applied', 'success', 1200);
    drawGraph();
    updateDOMHUD();
}

function addBridgeNote() {
    const source2 = state.objects.find((o: any) => o.id === 'source2' || String(o.label || '').toLowerCase().includes('source 2'));
    const synthesis = state.objects.find((o: any) => o.id === 'synthesis' || String(o.label || '').toLowerCase().includes('synthesis'));
    if (!source2 || !synthesis) {
        showToast('Bridge needs Source2 + Synthesis', 'warning', 1600);
        return;
    }

    const id = `bridge_note_${state.step}`;
    const bridge = {
        ...source2,
        id,
        label: 'Bridge Note',
        material: 'copper',
        x: (source2.x + synthesis.x) / 2,
        y: (source2.y + synthesis.y) / 2,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        activation: 0.25,
        stress: 0.12,
        sensory: 0.2,
        activationHistory: []
    };
    state.objects.push(bridge);
    state.edges.push(createLabEdge(`bridge_e1_${id}`, source2.id, id, 0.55));
    state.edges.push(createLabEdge(`bridge_e2_${id}`, id, synthesis.id, 0.55));

    appendEventLog('Intervention: added bridge note (Source2 → Bridge Note → Synthesis)', 'success');
    showToast('Bridge note added', 'success', 1200);
    drawGraph();
    updateDOMHUD();
}

function ensureInterventionTimelinePanel() {
    const side = document.querySelector('.mgs-side');
    if (!side) return;
    if (document.getElementById('mgs-demo-timeline')) return;

    const card = document.createElement('div');
    card.id = 'mgs-demo-timeline';
    card.className = 'mgs-card';
    card.innerHTML = `
      <h3>Demo Timeline</h3>
      <div id="mgs-demo-timeline-body" style="display:flex; flex-direction:column; gap:6px;"></div>
      <div style="font-size:0.6rem; color:#666; margin-top:6px;">
        Markers appear on the scrubber while recording/replay.
      </div>
    `;
    side.appendChild(card);
}

function updateExplainabilityPanels() {
    const metrics = computeExplainableMetrics();
    setText('metric-cognitive-load', metrics.cognitiveLoad.toFixed(2));
    setText('metric-coherence', metrics.coherence.toFixed(2));
    setText('metric-novelty', metrics.novelty.toFixed(2));

    const body = document.getElementById('material-laws-body');
    if (!body) return;
    body.innerHTML = renderMaterialEvidenceHTML();
}

function computeExplainableMetrics(): ExplainableMetrics {
    const activeIds = new Set(
        state.objects
            .filter((o: any) => o.activation >= EXPLAINABLE_METRICS_CONFIG.activeActivationThreshold)
            .map((o: any) => o.id)
    );

    const cognitiveLoad = state.objects.reduce((sum: number, o: any) => {
        const over = Math.max(0, (o.stress ?? 0) - EXPLAINABLE_METRICS_CONFIG.stressThreshold);
        return sum + over;
    }, 0);

    const activeEdges = state.edges.filter((e: any) => !e.severed && activeIds.has(e.sourceId) && activeIds.has(e.targetId));
    const coherence = activeEdges.length
        ? activeEdges.reduce((sum: number, e: any) => sum + (e.weight ?? 0), 0) / activeEdges.length
        : 0;

    const patternCounts: Record<string, number> = {};
    state.patterns.forEach((p: any) => {
        const t = String(p.type || 'unknown');
        patternCounts[t] = (patternCounts[t] || 0) + 1;
    });

    let patternDelta = 0;
    const allKeys = new Set([...Object.keys(patternCounts), ...Object.keys(lastExplainable.patternCounts)]);
    allKeys.forEach((k) => {
        patternDelta += Math.abs((patternCounts[k] || 0) - (lastExplainable.patternCounts[k] || 0));
    });

    const activeNodes = state.objects.filter((o: any) => activeIds.has(o.id));
    const centroid =
        activeNodes.length > 0
            ? {
                x: activeNodes.reduce((s: number, o: any) => s + o.x, 0) / activeNodes.length,
                y: activeNodes.reduce((s: number, o: any) => s + o.y, 0) / activeNodes.length
            }
            : null;

    const lastCentroid = lastExplainable.activeCentroid;
    const centroidMove = centroid && lastCentroid ? Math.hypot(centroid.x - lastCentroid.x, centroid.y - lastCentroid.y) : 0;

    const noveltyRaw = patternDelta * 0.25 + Math.min(1.5, centroidMove / 120) * 0.75;
    const novelty = Math.max(0, Math.min(1, noveltyRaw));

    lastExplainable = { patternCounts, activeCentroid: centroid };
    return { cognitiveLoad, coherence, novelty };
}

function getActiveMaterialLaw(material: string): MaterialLawV1 | null {
    const base = MATERIAL_LAWS_V1[material];
    if (!base) return null;
    const preset = MATERIAL_LAW_PRESETS_V1[activeMaterialLawPresetId];
    const override = preset?.overrides?.[material] || {};
    return { ...base, ...override };
}

function renderMaterialEvidenceHTML(): string {
    const present = new Map<string, { count: number; examples: string[] }>();
    state.objects.forEach((o: any) => {
        const key = String(o.material || 'unknown');
        if (!present.has(key)) present.set(key, { count: 0, examples: [] });
        const entry = present.get(key)!;
        entry.count += 1;
        if (entry.examples.length < 3) entry.examples.push(String(o.label));
    });

    const keys = Array.from(present.keys()).sort((a, b) => a.localeCompare(b));
    const lines = keys.map((mat) => {
        const law = getActiveMaterialLaw(mat);
        const meta = present.get(mat)!;
        const title = law ? law.label : mat;
        const props = law
            ? `cond ${law.conductivity.toFixed(2)} · visc ${law.viscosity.toFixed(2)} · brit ${law.brittleness.toFixed(2)} · damp ${law.noiseDamping.toFixed(2)}`
            : 'no v1 law';
        const examples = meta.examples.length ? `(${meta.examples.join(', ')})` : '';
        return `
          <div style="display:flex; flex-direction:column; gap:2px; padding:6px 8px; border:1px solid #1a1a1e; background:#0f0f12; border-radius:4px;">
            <div style="display:flex; justify-content:space-between; gap:8px;">
              <span style="color:#c4c4c4; font-weight:600;">${escapeHtml(title)}</span>
              <span style="color:#666; font-size:0.6rem;">×${meta.count}</span>
            </div>
            <div style="color:#888; font-size:0.65rem;">${escapeHtml(props)} ${escapeHtml(examples)}</div>
          </div>
        `;
    });

    return lines.join('');
}

function ensureMaterialLensControls() {
    const toolbar = document.querySelector('.mgs-toolbar');
    if (!toolbar) return;
    if (document.getElementById('lens-material')) return;

    const group = document.createElement('div');
    group.className = 'mgs-toolbar-group';
    group.innerHTML = `
      <label>Material Lens</label>
      <select id="lens-material" title="Show material-law properties as a lens (UI-only)">
        <option value="none" selected>None</option>
        <option value="conductivity">Conductivity</option>
        <option value="viscosity">Viscosity</option>
        <option value="brittleness">Brittleness</option>
        <option value="noiseDamping">Noise Damping</option>
      </select>
      <select id="material-law-preset" title="Select a material-law preset (UI-only)">
        ${Object.values(MATERIAL_LAW_PRESETS_V1)
            .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`)
            .join('')}
      </select>
    `;
    toolbar.appendChild(group);

    const lensSelect = document.getElementById('lens-material') as HTMLSelectElement | null;
    if (lensSelect) {
        lensSelect.value = materialLensMode;
        lensSelect.onchange = () => {
            materialLensMode = lensSelect.value as MaterialLensMode;
            updateMaterialLensUI();
            writeShareStateToURL({ lens: materialLensMode });
        };
    }

    const presetSelect = document.getElementById('material-law-preset') as HTMLSelectElement | null;
    if (presetSelect) {
        presetSelect.value = activeMaterialLawPresetId;
        presetSelect.onchange = () => {
            activeMaterialLawPresetId = presetSelect.value as any;
            updateExplainabilityPanels();
            updateMaterialLensUI();
            writeShareStateToURL({ materialPreset: activeMaterialLawPresetId });
        };
    }
}

function updateMaterialLensUI() {
    const existing = document.getElementById('mgs-card-material-lens');
    if (materialLensMode === 'none') {
        existing?.remove();
        return;
    }

    const side = document.querySelector('.mgs-side');
    if (!side) return;

    let card = document.getElementById('mgs-card-material-lens');
    if (!card) {
        card = document.createElement('div');
        card.id = 'mgs-card-material-lens';
        card.className = 'mgs-card';
        side.insertBefore(card, side.firstChild);
    }

    const key: keyof MaterialLawV1 = materialLensMode;
    const rows = state.objects
        .map((o: any) => {
            const law = getActiveMaterialLaw(String(o.material || 'unknown'));
            const val = law ? (law[key] ?? 0) : 0;
            return { id: o.id, label: o.label, material: o.material, value: val };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    const preset = MATERIAL_LAW_PRESETS_V1[activeMaterialLawPresetId];
    card.innerHTML = `
      <h3>Material Lens <span class="count">${escapeHtml(materialLensMode)}</span></h3>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${rows
            .map((r) => {
                const v = Number(r.value).toFixed(2);
                return `
            <div style="display:flex; justify-content:space-between; gap:10px; padding:6px 8px; border:1px solid #1a1a1e; background:#0f0f12; border-radius:4px;">
              <div style="min-width:0;">
                <div style="color:#c4c4c4; font-size:0.65rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(String(r.label))}</div>
                <div style="color:#666; font-size:0.6rem;">${escapeHtml(String(r.material))}</div>
              </div>
              <div style="color:#e6ff1a; font-family:inherit; font-size:0.7rem; font-weight:700;">${v}</div>
            </div>
          `;
            })
            .join('')}
        <div style="font-size:0.6rem; color:#666; line-height:1.35;">
          Preset: <strong style="color:#e6ff1a;">${escapeHtml(preset.label)}</strong> — ${escapeHtml(preset.description)}
        </div>
      </div>
    `;
}

function ensurePoCDemoControls() {
    const toolbar = document.querySelector('.mgs-toolbar');
    if (!toolbar) return;
    if (document.getElementById('btn-poc-demo')) return;

    const group = document.createElement('div');
    group.className = 'mgs-toolbar-group';
    group.innerHTML = `
      <label>PoC</label>
      <button id="btn-load-concept-forge" class="secondary" title="Load the Concept Forge PoC graph as a scene">Load Concept Forge PoC</button>
      <button id="btn-compare-material-presets" class="secondary" title="Run two short sims and compare outcomes (UI-only)">Compare Presets</button>
      <button id="btn-poc-demo" class="secondary" title="Run a 30s recruiter-repeatable MindGraphSim demo">Run 30s Demo</button>
    `;
    toolbar.appendChild(group);

    const btnLoad = document.getElementById('btn-load-concept-forge');
    btnLoad?.addEventListener('click', () => loadConceptForgePoC());

    const btnCompare = document.getElementById('btn-compare-material-presets');
    btnCompare?.addEventListener('click', () => runMaterialPresetComparison());

    const btn = document.getElementById('btn-poc-demo');
    btn?.addEventListener('click', () => runPoCDemo());
}

function ensureShareControls() {
    const toolbar = document.querySelector('.mgs-toolbar');
    if (!toolbar) return;
    if (document.getElementById('btn-copy-link')) return;

    const group = document.createElement('div');
    group.className = 'mgs-toolbar-group';
    group.innerHTML = `
      <label>Share</label>
      <button id="btn-copy-link" class="secondary" title="Copy a shareable link to this exact lab state">Copy Link</button>
    `;
    toolbar.appendChild(group);

    const btn = document.getElementById('btn-copy-link');
    btn?.addEventListener('click', async () => {
        const url = buildShareURL();
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            showToast('Copied share link', 'success', 1400);
            appendEventLog(`[SHARE] Copied link`, 'info');
        } catch (err) {
            console.error(err);
            showToast('Copy failed (see console)', 'error', 1600);
            appendEventLog('[SHARE] Copy failed', 'error');
        }
    });
}

function loadConceptForgePoC() {
    stopPoCDemo();
    isRunning = false;

    // Reset via a known scene to keep engine internals consistent, then replace state with our PoC graph.
    loadScene('blank');

    const nodes = [
        // Core system nodes
        { id: 'cf', label: 'Concept Forge', material: 'gold', nx: 0.18, ny: 0.35, role: 'Bridge' },
        { id: 'mgs', label: 'MindGraphSim', material: 'mycelium', nx: 0.18, ny: 0.55, role: 'Anchor' },
        { id: 'md', label: 'Methodology Decider', material: 'silver', nx: 0.38, ny: 0.40, role: 'Bridge' },
        { id: 'rlaif', label: 'RLAIF Loop', material: 'iron', nx: 0.38, ny: 0.60, role: 'Sentinel' },
        { id: 'llm', label: 'LLM (Gemma 3n)', material: 'titanium', nx: 0.38, ny: 0.25, role: 'Explorer' },

        // Data structures
        { id: 'fv', label: 'Feature Vector', material: 'quartz', nx: 0.55, ny: 0.38, role: 'Anchor' },
        { id: 'sw', label: 'Scalar Weight', material: 'quartz', nx: 0.55, ny: 0.62, role: 'Anchor' },

        // Material-as-cognition nodes
        { id: 'gold', label: 'Gold: Anchor', material: 'gold', nx: 0.75, ny: 0.22, role: 'Anchor' },
        { id: 'iron_m', label: 'Iron: Practical', material: 'iron', nx: 0.75, ny: 0.38, role: 'Anchor' },
        { id: 'quartz', label: 'Quartz: Sources', material: 'quartz', nx: 0.75, ny: 0.54, role: 'Anchor' },
        { id: 'carbon', label: 'Carbon: Versatile', material: 'carbon', nx: 0.75, ny: 0.70, role: 'Bridge' },
        { id: 'copper', label: 'Copper: Notes', material: 'copper', nx: 0.75, ny: 0.86, role: 'Explorer' }
    ];

    const edges = [
        { source: 'cf', target: 'mgs', weight: 0.9 },
        { source: 'cf', target: 'llm', weight: 0.7 },
        { source: 'llm', target: 'gold', weight: 0.5 },
        { source: 'llm', target: 'iron_m', weight: 0.5 },
        { source: 'llm', target: 'quartz', weight: 0.5 },
        { source: 'llm', target: 'carbon', weight: 0.5 },
        { source: 'llm', target: 'copper', weight: 0.5 },

        { source: 'fv', target: 'md', weight: 0.8 },
        { source: 'sw', target: 'rlaif', weight: 0.8 },
        { source: 'md', target: 'mgs', weight: 0.55 },
        { source: 'rlaif', target: 'mgs', weight: 0.55 },

        // "Behavior" edges: recruiter-readable explanations
        { source: 'gold', target: 'fv', weight: 0.65 },
        { source: 'iron_m', target: 'fv', weight: 0.7 },
        { source: 'quartz', target: 'fv', weight: 0.7 },
        { source: 'carbon', target: 'sw', weight: 0.65 },
        { source: 'copper', target: 'sw', weight: 0.55 }
    ];

    state.objects = nodes.map((n) => createLabObject(n.id, n.label, n.material, n.nx, n.ny, n.role));
    state.edges = edges.map((e, idx) => createLabEdge(`cf_poc_e${idx}`, e.source, e.target, e.weight));
    state.patterns = [];
    state.step = 0;
    state.overloads = 0;
    state.recoveries = 0;
    state.ambient = { noise: 0.2, safety: 0.7 };

    appendEventLog('[PoC] Loaded Concept Forge graph', 'success');
    appendEventLog('Try: click Run 30s Demo for a story run, or use Export → Run JSON.', 'info');
    writeShareStateToURL({ layout: 'concept_forge', scene: undefined });
    drawGraph();
    updateDOMHUD();
}

function createLabObject(id: string, label: string, material: string, nx: number, ny: number, role: string) {
    const mat = MATERIALS_VIZ_V1[material] || MATERIALS_VIZ_V1.iron;
    const x = Math.max(40, Math.min(960, nx * 1000));
    const y = Math.max(40, Math.min(720, ny * 760));

    const roleMassMultiplier =
        role === 'Anchor' ? 1.4 : role === 'Explorer' ? 0.7 : role === 'Bridge' ? 1.0 : role === 'Sentinel' ? 1.1 : 1.0;

    return {
        id,
        label,
        material,
        mat,
        role,

        x,
        y,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,

        mass: mat.mass * roleMassMultiplier,
        activation: 0.35 + Math.random() * 0.15,
        sensory: 0.25 + Math.random() * 0.2,
        energy: 0.55 + Math.random() * 0.2,
        stress: 0.12 + Math.random() * 0.18,
        overloaded: false,
        overloadEnergy: 0,
        activationHistory: [],
        alertCooldown: 0,
        pinned: false
    };
}

function createLabEdge(id: string, sourceId: string, targetId: string, weight: number = 1) {
    const baseLength = physicsConfig.layout?.targetSpacing || physicsConfig.spring.base_length;
    return {
        id,
        sourceId,
        targetId,
        weight,
        spring_k: physicsConfig.spring.stiffness * weight,
        rest_length: baseLength * (0.8 + 0.4 / Math.max(0.1, weight)),
        tension: 0,
        severed: false,
        recovery: 0
    };
}

type PresetComparisonResult = {
    presetId: string;
    presetLabel: string;
    steps: number;
    overloads: number;
    maxNoise: number;
    cognitiveLoadFinal: number;
    coherenceFinal: number;
    novelty: number;
    timeToSynthesisStep: number | null;
    firstCopperOverloadStep: number | null;
};

function runMaterialPresetComparison(seedOverride?: number) {
    if (comparisonRunning) return;

    stopPoCDemo();
    isRunning = false;
    comparisonRunning = true;

    const priorPreset = activeMaterialLawPresetId;
    const snapshot = snapshotLabState();

    showToast('Comparing material-law presets…', 'info', 1800);
    appendEventLog('[COMPARE] Running two short sims…', 'info');
    const seed = typeof seedOverride === 'number' && Number.isFinite(seedOverride)
        ? seedOverride
        : (shareSeed ?? ((Date.now() >>> 0) || 1));
    shareSeed = seed;
    writeShareStateToURL({ scene: 'research_session', layout: undefined, autostart: 'compare', seed });

    // Let the toast/log paint before we run the sims.
    window.setTimeout(() => {
        try {
            const results = withSeededRandom(seed, () => {
                const a = simulatePresetRun('copper_fast_brittle', 220);
                const b = simulatePresetRun('copper_stable', 220);
                return { a, b };
            });

            renderComparisonCard(results.a, results.b, seed);
            showToast('Comparison complete (see sidebar).', 'success', 2000);
            appendEventLog('[COMPARE] Complete', 'success');
        } catch (err) {
            console.error(err);
            showToast('Comparison failed (see console).', 'error', 2200);
            appendEventLog('[COMPARE] Failed', 'error');
        } finally {
            activeMaterialLawPresetId = priorPreset;
            restoreLabState(snapshot);
            comparisonRunning = false;
            drawGraph();
            updateDOMHUD();
        }
    }, 20);
}

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function withSeededRandom<T>(seed: number, fn: () => T): T {
    const original = Math.random;
    // @ts-ignore override for deterministic comparison runs (UI-only)
    Math.random = mulberry32(seed);
    try {
        return fn();
    } finally {
        // @ts-ignore restore
        Math.random = original;
    }
}

function snapshotLabState() {
    const payload = {
        state: {
            objects: state.objects,
            edges: state.edges,
            patterns: state.patterns,
            step: state.step,
            overloads: state.overloads,
            recoveries: state.recoveries,
            ambient: state.ambient,
            metrics: state.metrics,
            displayPatterns: (state as any).displayPatterns
        },
        preset: activeMaterialLawPresetId
    };

    // structuredClone is widely supported in modern browsers; fallback keeps it safe for older environments.
    // @ts-ignore
    if (typeof structuredClone === 'function') return structuredClone(payload);
    return JSON.parse(JSON.stringify(payload));
}

function restoreLabState(snapshot: any) {
    const s = snapshot?.state;
    if (!s) return;
    state.objects = s.objects || [];
    state.edges = s.edges || [];
    state.patterns = s.patterns || [];
    state.step = s.step || 0;
    state.overloads = s.overloads || 0;
    state.recoveries = s.recoveries || 0;
    state.ambient = s.ambient || { noise: 0.2, safety: 0.7 };
    state.metrics = s.metrics || {};
    (state as any).displayPatterns = s.displayPatterns || [];
    activeMaterialLawPresetId = snapshot.preset || activeMaterialLawPresetId;
}

function tryRestoreFromURL() {
    const q = new URLSearchParams(window.location.search);
    if ([...q.keys()].length === 0) return;

    restoringFromURL = true;
    try {
        const scene = q.get('scene');
        const profileId = q.get('profile');
        const frameId = q.get('frame');
        const modelId = q.get('model');
        const presetId = q.get('materialPreset');
        const lens = q.get('lens') as MaterialLensMode | null;
        const autostart = q.get('autostart') as ShareState['autostart'] | null;
        const layout = q.get('layout') as ShareState['layout'] | null;
        const seed = q.get('seed') ? Number(q.get('seed')) : null;

        if (presetId && (MATERIAL_LAW_PRESETS_V1 as any)[presetId]) {
            activeMaterialLawPresetId = presetId as any;
        }
        if (lens && ['none', 'conductivity', 'viscosity', 'brittleness', 'noiseDamping'].includes(lens)) {
            materialLensMode = lens;
        }
        if (typeof seed === 'number' && Number.isFinite(seed)) shareSeed = seed;

        const presetSelect = document.getElementById('material-law-preset') as HTMLSelectElement | null;
        if (presetSelect) presetSelect.value = activeMaterialLawPresetId;
        const lensSelect = document.getElementById('lens-material') as HTMLSelectElement | null;
        if (lensSelect) lensSelect.value = materialLensMode;

        if (layout === 'concept_forge') {
            loadConceptForgePoC();
        } else if (scene) {
            loadScene(scene);
        }

        if (profileId) applyProfile(profileId);
        if (frameId) applyFrame(frameId);
        if (modelId) applyModel(modelId);

        drawGraph();
        updateDOMHUD();

        // Autostart actions (optional)
        if (autostart === 'compare') {
            runMaterialPresetComparison(shareSeed ?? undefined);
        } else if (autostart === 'demo') {
            runPoCDemo(shareSeed ?? undefined);
        }
    } catch (err) {
        console.error(err);
        appendEventLog('[SHARE] Restore failed', 'error');
    } finally {
        restoringFromURL = false;
        // Normalize URL to reflect current restored state
        writeShareStateToURL({});
    }
}

function simulatePresetRun(presetId: keyof typeof MATERIAL_LAW_PRESETS_V1, steps: number): PresetComparisonResult {
    activeMaterialLawPresetId = presetId;

    loadScene('research_session');
    applyProfile('open_neutral');
    applyFrame('frame_open_exploration');

    // Ensure a clean baseline.
    state.step = 0;
    state.overloads = 0;
    state.recoveries = 0;
    state.ambient.noise = 0.2;

    // Shared interventions to keep the comparison fair.
    InputAdapter.applyEvent({ target: 'node', selector: 'question', channel: 'activation', mode: 'add', magnitude: 0.35 });

    const uniquePatternTypes = new Set<string>();
    let maxNoise = 0;
    let timeToSynthesisStep: number | null = null;
    let firstCopperOverloadStep: number | null = null;
    let centroidMoveSum = 0;
    let lastCentroid: { x: number; y: number } | null = null;

    for (let i = 0; i < steps; i++) {
        if (i === 60) InputAdapter.applyEvent({ target: 'node', selector: 'note2', channel: 'activation', mode: 'add', magnitude: 0.28 });
        if (i === 120) InputAdapter.applyEvent({ target: 'node', selector: 'synthesis', channel: 'activation', mode: 'add', magnitude: 0.22 });

        stepSimulation(1);

        maxNoise = Math.max(maxNoise, state.ambient.noise ?? 0);

        for (const p of state.patterns || []) uniquePatternTypes.add(String((p as any).type || 'unknown'));

        const synthesis = state.objects.find((o: any) => o.id === 'synthesis');
        if (timeToSynthesisStep === null && synthesis && (synthesis.activation ?? 0) >= 0.65) {
            timeToSynthesisStep = state.step;
        }

        const copperOver = state.objects.some((o: any) => String(o.material) === 'copper' && Boolean(o.overloaded));
        if (firstCopperOverloadStep === null && copperOver) firstCopperOverloadStep = state.step;

        // Motion component for novelty: active centroid movement over time.
        const centroid = computeActiveCentroid(EXPLAINABLE_METRICS_CONFIG.activeActivationThreshold);
        if (centroid && lastCentroid) centroidMoveSum += Math.hypot(centroid.x - lastCentroid.x, centroid.y - lastCentroid.y);
        lastCentroid = centroid;
    }

    const preset = MATERIAL_LAW_PRESETS_V1[presetId];
    const cognitiveLoadFinal = computeCognitiveLoadNow();
    const coherenceFinal = computeCoherenceNow(EXPLAINABLE_METRICS_CONFIG.activeActivationThreshold);
    const novelty = Math.max(0, Math.min(1, uniquePatternTypes.size / 4 + Math.min(1, centroidMoveSum / 1200)));

    return {
        presetId,
        presetLabel: preset.label,
        steps,
        overloads: state.overloads ?? 0,
        maxNoise,
        cognitiveLoadFinal,
        coherenceFinal,
        novelty,
        timeToSynthesisStep,
        firstCopperOverloadStep
    };
}

function computeCognitiveLoadNow() {
    return state.objects.reduce((sum: number, o: any) => {
        const over = Math.max(0, (o.stress ?? 0) - EXPLAINABLE_METRICS_CONFIG.stressThreshold);
        return sum + over;
    }, 0);
}

function computeCoherenceNow(activeThreshold: number) {
    const active = new Set(
        state.objects.filter((o: any) => (o.activation ?? 0) >= activeThreshold).map((o: any) => o.id)
    );
    const activeEdges = state.edges.filter((e: any) => !e.severed && active.has(e.sourceId) && active.has(e.targetId));
    if (activeEdges.length === 0) return 0;
    return activeEdges.reduce((sum: number, e: any) => sum + (e.weight ?? 0), 0) / activeEdges.length;
}

function computeActiveCentroid(activeThreshold: number): { x: number; y: number } | null {
    const activeNodes = state.objects.filter((o: any) => (o.activation ?? 0) >= activeThreshold);
    if (activeNodes.length === 0) return null;
    return {
        x: activeNodes.reduce((s: number, o: any) => s + (o.x ?? 0), 0) / activeNodes.length,
        y: activeNodes.reduce((s: number, o: any) => s + (o.y ?? 0), 0) / activeNodes.length
    };
}

function renderComparisonCard(a: PresetComparisonResult, b: PresetComparisonResult, seed: number) {
    const side = document.querySelector('.mgs-side');
    if (!side) return;

    let card = document.getElementById('mgs-card-comparison');
    if (!card) {
        card = document.createElement('div');
        card.id = 'mgs-card-comparison';
        card.className = 'mgs-card';
        side.insertBefore(card, side.firstChild);
    }

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');
    const stepOrDash = (n: number | null) => (typeof n === 'number' ? String(n) : '—');

    card.innerHTML = `
      <h3>Preset Compare <span class="count">seed ${seed}</span></h3>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="color:#888; font-size:0.65rem; line-height:1.35;">
          Same scene + interventions, different material-law presets (UI-only).
        </div>
        ${renderComparisonRow(a)}
        ${renderComparisonRow(b)}
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:0.65rem; color:#888;">
          <div><span style="color:#666;">Δ coherence</span> <span style="color:#e6ff1a;">${fmt(b.coherenceFinal - a.coherenceFinal)}</span></div>
          <div><span style="color:#666;">Δ overloads</span> <span style="color:#e6ff1a;">${fmt(b.overloads - a.overloads)}</span></div>
        </div>
      </div>
    `;

    function renderComparisonRow(r: PresetComparisonResult) {
        return `
          <div style="border:1px solid #1a1a1e; background:#0f0f12; border-radius:4px; padding:8px;">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
              <div style="color:#c4c4c4; font-weight:700;">${escapeHtml(r.presetLabel)}</div>
              <div style="color:#666; font-size:0.6rem;">${r.steps} steps</div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:6px; font-size:0.65rem;">
              <div><span style="color:#666;">coherence</span> <span style="color:#e6ff1a;">${fmt(r.coherenceFinal)}</span></div>
              <div><span style="color:#666;">load</span> <span style="color:#e6ff1a;">${fmt(r.cognitiveLoadFinal)}</span></div>
              <div><span style="color:#666;">novelty</span> <span style="color:#e6ff1a;">${fmt(r.novelty)}</span></div>
              <div><span style="color:#666;">max noise</span> <span style="color:#e6ff1a;">${fmt(r.maxNoise)}</span></div>
              <div><span style="color:#666;">synthesis ≥0.65</span> <span style="color:#e6ff1a;">${escapeHtml(stepOrDash(r.timeToSynthesisStep))}</span></div>
              <div><span style="color:#666;">copper overload</span> <span style="color:#e6ff1a;">${escapeHtml(stepOrDash(r.firstCopperOverloadStep))}</span></div>
            </div>
          </div>
        `;
    }
}

function runPoCDemo(seedOverride?: number) {
    if (pocDemo.running) return;
    stopPoCDemo();

    pocDemo.running = true;
    pocDemo.remainingSteps = 450; // ~30s at 15 steps/sec tick below

    isRunning = false;
    const seed = typeof seedOverride === 'number' && Number.isFinite(seedOverride)
        ? seedOverride
        : (shareSeed ?? ((Date.now() >>> 0) || 1));
    startSeededRandom(seed);
    showToast('PoC demo: Research → Notes → Synthesis', 'info', 2200);
    appendEventLog('[DEMO] Loading Research Mesh…', 'info');

    loadScene('research_session');
    applyProfile('open_neutral');
    applyFrame('frame_open_exploration');
    writeShareStateToURL({ scene: 'research_session', layout: undefined, autostart: 'demo', seed });
    drawGraph();
    updateDOMHUD();

    const recorder = (window as any).Recorder;
    if (recorder?.start) recorder.start();
    updateRecorderHint();
    appendEventLog(`[DEMO] Recording last ${getRecorderCapacity()} frames`, 'info');
    ensureInterventionTimelinePanel();
    clearInterventionMarkers();

    // Step 1: intervention - nudge Question
    InputAdapter.applyEvent({ target: 'node', selector: 'question', channel: 'activation', mode: 'add', magnitude: 0.35 });
    appendIntervention('Intervention: user nudged activation of Question → ripple begins', 'info');

    let tick = 0;
    pocDemo.intervalId = window.setInterval(() => {
        if (!pocDemo.running) return;
        if (pocDemo.remainingSteps <= 0) {
            appendEventLog('Synthesis stabilized (demo complete)', 'success');
            showToast('Demo complete: open Catalog, scrub replay, export run.', 'success', 2600);
            stopPoCDemo();
            return;
        }

        // Run a small batch per tick for visible motion without stalling.
        stepSimulation(1);

        // Demo beats
        tick += 1;
        if (tick === 70) {
            InputAdapter.applyEvent({ target: 'node', selector: 'note2', channel: 'activation', mode: 'add', magnitude: 0.28 });
            appendIntervention('Copper notes conduct faster → overload risk climbs', 'warning');
        }
        if (tick === 140) {
            InputAdapter.applyEvent({ target: 'node', selector: 'synthesis', channel: 'activation', mode: 'add', magnitude: 0.22 });
            appendIntervention('Intervention: boosted Synthesis → field coherence increases', 'info');
        }
        if (tick === 240) {
            appendIntervention('Mineral sources stay stable anchors under load', 'info');
        }

        // Draw + HUD
        drawGraph();
        updateDOMHUD();
        pocDemo.remainingSteps -= 1;
    }, 66); // ~15 ticks/sec
}

function stopPoCDemo() {
    if (pocDemo.intervalId) window.clearInterval(pocDemo.intervalId);
    pocDemo.intervalId = null;
    pocDemo.running = false;
    stopSeededRandom();
}

function clearInterventionMarkers() {
    interventionMarkers.splice(0, interventionMarkers.length);
}

function appendIntervention(message: string, kind: ToastKind) {
    interventionMarkers.push({ step: state.step, label: message, kind });
    appendEventLog(message, kind);
}

function applyMaterialLawLayer() {
    if (!pocDemo.running && !comparisonRunning) return;

    // Demo-only material "laws" layer: adds explainable, visible behavior without changing engine integration/forces/pattern logic.
    const activationDeltas: Record<string, number> = {};

    const getLaw = (o: any) => getActiveMaterialLaw(String(o.material || 'unknown'));
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    for (const e of state.edges) {
        if (e.severed) continue;
        const src = state.objects.find((o: any) => o.id === e.sourceId);
        const tgt = state.objects.find((o: any) => o.id === e.targetId);
        if (!src || !tgt) continue;

        const srcLaw = getLaw(src);
        const tgtLaw = getLaw(tgt);
        if (!srcLaw || !tgtLaw) continue;

        const gradient = (src.activation ?? 0) - (tgt.activation ?? 0);
        if (Math.abs(gradient) < 0.05) continue;

        // Copper conducts: faster propagation from high-conductivity materials.
        const edgeWeight = e.weight ?? 0.5;
        const conduct = srcLaw.conductivity;
        const viscosityBrake = 0.65 + tgtLaw.viscosity * 0.6;
        const flow = gradient * 0.012 * edgeWeight * conduct / viscosityBrake;

        activationDeltas[tgt.id] = (activationDeltas[tgt.id] || 0) + flow;
        activationDeltas[src.id] = (activationDeltas[src.id] || 0) - flow * 0.35;

        // Brittleness couples fast activation changes into sensory load (overload sooner).
        const sensoryKick = Math.abs(flow) * (tgtLaw.brittleness * 0.18);
        if (sensoryKick > 0) tgt.sensory = clamp01((tgt.sensory ?? 0) + sensoryKick);
    }

    // Bio dampens: active mycelium gently reduces ambient noise.
    const bioDamping = state.objects.reduce((sum: number, o: any) => {
        const law = getLaw(o);
        if (!law) return sum;
        const isMycelium = String(o.material) === 'mycelium';
        if (!isMycelium) return sum;
        const act = o.activation ?? 0;
        return sum + law.noiseDamping * Math.max(0, act - 0.45);
    }, 0);
    if (bioDamping > 0) {
        state.ambient.noise = clamp01(state.ambient.noise * (1 - Math.min(0.02, bioDamping * 0.004)));
    }

    Object.entries(activationDeltas).forEach(([id, delta]) => {
        const o = state.objects.find((x: any) => x.id === id);
        if (!o) return;
        o.activation = clamp01((o.activation ?? 0) + delta);
    });
}

function updateInterventionTimelineUI() {
    ensureInterventionTimelinePanel();

    const scrubber = document.getElementById('scrubber') as HTMLInputElement | null;
    const modeBadge = document.getElementById('mode-badge');
    const timeline = document.getElementById('mgs-demo-timeline-body');
    if (!timeline) return;

    if (interventionMarkers.length === 0) {
        timeline.innerHTML = `<div style="color:#888; font-size:0.65rem;">Run the PoC demo to generate a repeatable intervention trace.</div>`;
    } else {
        timeline.innerHTML = interventionMarkers
            .slice(-8)
            .map((m) => {
                const badge =
                    m.kind === 'success'
                        ? '✓'
                        : m.kind === 'warning'
                            ? '!'
                            : m.kind === 'error'
                                ? '×'
                                : '•';
                return `
          <button data-step="${m.step}" class="secondary" style="text-align:left; width:100%; border:1px solid #2a2a2a; background:#0f0f12; padding:6px 8px; border-radius:4px; cursor:pointer;">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
              <span style="color:#c4c4c4; font-size:0.65rem;"><span style="color:#e6ff1a; font-weight:700;">${badge}</span> Step ${m.step}</span>
              <span style="color:#666; font-size:0.6rem;">jump</span>
            </div>
            <div style="color:#888; font-size:0.65rem; margin-top:3px;">${escapeHtml(m.label)}</div>
          </button>
        `;
            })
            .join('');

        timeline.querySelectorAll('button[data-step]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const step = Number((btn as HTMLElement).getAttribute('data-step') || 0);
                jumpReplayToStep(step);
            });
        });
    }

    // Scrubber markers
    if (scrubber) {
        let markerRow = document.getElementById('mgs-scrubber-markers');
        if (!markerRow) {
            markerRow = document.createElement('div');
            markerRow.id = 'mgs-scrubber-markers';
            markerRow.className = 'mgs-marker-row';
            scrubber.parentElement?.appendChild(markerRow);
        }
        markerRow.innerHTML = renderScrubberMarkersHTML();
    }

    // "Return to live" affordance when in replay
    const timelineEl = document.querySelector('.mgs-timeline');
    if (timelineEl && !document.getElementById('btn-return-live')) {
        const actions = document.createElement('div');
        actions.className = 'mgs-timeline-actions';
        actions.innerHTML = `<button id="btn-return-live" title="Exit replay and resume live simulation" style="display:none;">Return to Live</button>`;
        modeBadge?.insertAdjacentElement('afterend', actions);
        const btn = document.getElementById('btn-return-live');
        btn?.addEventListener('click', () => {
            const replay = (window as any).ReplaySystem;
            if (replay?.exit) replay.exit();
            isRunning = true;
            const playBtn = document.getElementById('btn-play');
            playBtn?.classList.toggle('active', isRunning);
            play();
        });
    }

    const returnBtn = document.getElementById('btn-return-live') as HTMLButtonElement | null;
    const isReplay = Boolean(modeBadge?.classList.contains('replay'));
    if (returnBtn) returnBtn.style.display = isReplay ? 'inline-flex' : 'none';
}

function renderScrubberMarkersHTML(): string {
    const recorder = (window as any).Recorder;
    const frames = recorder?.buffer as Array<any> | undefined;
    if (!frames || frames.length < 2 || interventionMarkers.length === 0) return '';

    const maxIndex = frames.length - 1;
    const markers = interventionMarkers
        .slice(-8)
        .map((m) => {
            let idx = 0;
            for (let i = 0; i < frames.length; i++) {
                if ((frames[i]?.step ?? 0) >= m.step) { idx = i; break; }
                idx = i;
            }
            const pct = (idx / maxIndex) * 100;
            return `<span class="mgs-marker ${m.kind}" style="left:${pct.toFixed(2)}%;" title="${escapeHtml(m.label)}"></span>`;
        })
        .join('');

    return markers;
}

function jumpReplayToStep(step: number) {
    const recorder = (window as any).Recorder;
    const replay = (window as any).ReplaySystem;
    const scrubber = document.getElementById('scrubber') as HTMLInputElement | null;
    const frames = recorder?.buffer as Array<any> | undefined;
    if (!frames || frames.length === 0 || !scrubber) return;

    let idx = 0;
    for (let i = 0; i < frames.length; i++) {
        if ((frames[i]?.step ?? 0) >= step) { idx = i; break; }
        idx = i;
    }

    // Use engine replay if present; otherwise scrubber event.
    if (replay?.seek) replay.seek(idx);
    scrubber.value = String(idx);
    scrubber.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`Jumped to step ${step} (frame ${idx})`, 'info', 1200);
}
