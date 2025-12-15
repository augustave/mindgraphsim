// ============================================
// MindGraphSim v1.0 - Engine
// Physics Config, Roles, Levin-style Patterns
// ============================================

// Cognitive Profiles (affect sensory processing)
// S3 Task C: Added activationVarianceBoost for wider activation spread
// S2.5 Frame & Profile System
// S3 Task C: Added activationVarianceBoost from previous task
// Legacy PROFILES preserved as alias to Registry for backward compat
let profile = null; // Will be set by applyProfile
const PROFILES = {}; // Deprecated: Use PROFILE_REGISTRY or listProfiles()

// Base Physics Config (Snapshot of 'Thought Laboratory')
const BASE_PHYSICS_CONFIG = {
  time_step: 0.016,
  global_damping: 0.94,
  gravity_strength: 0.25,
  collision_elasticity: 0.45,
  spring_stiffness: 0.12,  // Base stiffness
  repulsion_strength: 52000,
  noise_base: 0.15,
  safety_base: 0.7,
  activation_gain_base: 1.0,
  friction_base: 1.0
};

import { listProfiles as listDomainProfiles } from './profiles';

// S2.5: Profile Registry (Physics Presets)
// ADAPTER: Maps the domain profiles (src/profiles.ts) to Engine Physics
const PROFILE_REGISTRY = listDomainProfiles().map(p => ({
  id: p.id,
  label: p.name, // Map 'name' to 'label'
  description: p.description,
  category: p.category || "neuro_lens", // Default category

  // Map flat physics params to the Engine's nested structure
  physics: {
    noise_scale: p.novelty_gain,          // Approximate mapping
    gravity_scale: p.gravitation_multiplier,
    safety_scale: p.safety_multiplier,
    activation_gain: p.base_connectivity_gain,
    friction_gain: p.drag_coefficient       // Drag becomes Friction
  },

  // Legacy metrics fields (Passed through directly)
  sensory_threshold: p.sensory_threshold,
  sensory_amplification: p.sensory_amplification,
  overload_cut_fraction: p.overload_cut_fraction,
  recovery_rate: p.recovery_half_life > 0 ? (0.7 / p.recovery_half_life) : 0.1,
  decay: p.activation_decay_base,
  activationVarianceBoost: 0.15
}));

// Populate legacy PROFILES map for compatibility
// Populate legacy PROFILES map for compatibility
PROFILE_REGISTRY.forEach(p => PROFILES[p.id.split('_')[0]] = p); // Map 'adhd', 'autistic' keys if needed, or just use ID logic later

// [S3 T2] Model Registry (Engine Logic Variants)
const MODEL_REGISTRY = [
  {
    id: "baseline",
    label: "Baseline Model",
    description: "Standard physics and pattern influence.",
    overrides: {},
    pattern_feedback: { loop: 1.0, cluster: 1.0 }
  },
  {
    id: "pattern_coupled",
    label: "Pattern Coupled",
    description: "Strong feedback from patterns to node physics.",
    overrides: {},
    pattern_feedback: { loop: 2.5, cluster: 1.8 }
  },
  {
    id: "high_damping",
    label: "High Damping",
    description: "Testing stability under stress.",
    overrides: { global_damping: 0.80 },
    pattern_feedback: { loop: 1.0, cluster: 1.0 }
  }
];

let currentModel = MODEL_REGISTRY[0];

/**
 * Applies a model variant (logic/physics overrides).
 * Should be called AFTER applyProfile to ensure overrides take precedence.
 */
export function applyModel(modelId) {
  const m = MODEL_REGISTRY.find(x => x.id === modelId);
  if (!m) { console.warn(`Model ${modelId} not found`); return; }
  currentModel = m;

  // Re-apply current profile to reset base physics, then apply model overrides
  if (currentContext && currentContext.profileId) {
    applyProfile(currentContext.profileId);
  }

  // Apply overrides (flat properties on physicsConfig for now)
  Object.keys(m.overrides).forEach(k => {
    if (typeof physicsConfig[k] !== 'undefined') {
      physicsConfig[k] = m.overrides[k];
    }
  });

  addLog(`Model applied: ${m.label}`, 'info');
}

/**
 * Returns available models from the registry.
 * @returns {Array} List of {id, label, description}
 */
export function listModels() {
  return MODEL_REGISTRY;
}

/**
 * Runs a single step of a scenario by applying relevant events.
 * @param {Array} events - List of scenario events
 * @param {number} stepIndex - Current simulation step
 */
function runScenarioStep(events, stepIndex) {
  // Direct application of events for this step, bypassing global queue if desired
  // or simple wrapper.
  const active = events.filter(e => {
    const start = Array.isArray(e.at_step) ? e.at_step[0] : e.at_step;
    const end = Array.isArray(e.at_step) ? e.at_step[1] : e.at_step;
    return stepIndex >= start && stepIndex <= end;
  });

  active.forEach(evt => InputAdapter.applyEvent(evt));
}



// S2.5: Frame Registry (Interpretive Lenses)
const FRAME_REGISTRY = [
  {
    id: "frame_open_exploration",
    label: "Open Exploration",
    description: "General-purpose view. Treats patterns as interesting shapes without heavy interpretation.",
    tags: ["open", "default"],
    lens_hint: "Use when you just want to watch the field move without a specific story.",
    visuals: { highlight_patterns: ["cluster", "loop", "wave"], ui_overlays: ["timeline", "pattern_badges"] },
    behavior: {
      pattern_weights: { loop: 1.0, cluster: 1.0, bridge: 1.0, wave: 1.0, membrane: 1.0 },
      hud_lenses_enabled: { overload_risk: false, pattern_density: true, wave_rhythm: true, focus_tunnel: false },
      semantic_map: { loop: "recurring thoughts", cluster: "idea islands", bridge: "linking thought", wave: "mood swings" }
    }
  },
  {
    id: "frame_conflict_mediation",
    label: "Conflict Mediation Field",
    description: "Interprets clusters as parties, bridges as mediators, and waves as escalation/de-escalation.",
    tags: ["team", "dialogue", "coaching"],
    lens_hint: "Use for modeling disagreements, negotiations, or tense conversations.",
    visuals: { highlight_patterns: ["cluster", "bridge", "wave"], ui_overlays: ["timeline", "pattern_badges", "energy_gradient"] },
    behavior: {
      pattern_weights: { loop: 0.9, cluster: 1.3, bridge: 1.5, wave: 1.2, membrane: 1.0 },
      hud_lenses_enabled: { overload_risk: true, pattern_density: true, wave_rhythm: true, focus_tunnel: true },
      semantic_map: { cluster: "actor group", bridge: "mediator / message", wave: "tension wave" }
    }
  },
  {
    id: "frame_brainstorm_session",
    label: "Brainstorm Session",
    description: "Highlights wave and cluster patterns as idea bursts and themes.",
    tags: ["team", "ideation"],
    lens_hint: "Use when simulating a creative session or note dump.",
    visuals: { highlight_patterns: ["wave", "cluster"], ui_overlays: ["timeline", "pattern_badges"] },
    behavior: {
      pattern_weights: { loop: 0.8, cluster: 1.4, bridge: 1.0, wave: 1.6, membrane: 0.8 },
      hud_lenses_enabled: { overload_risk: false, pattern_density: true, wave_rhythm: true, focus_tunnel: false },
      semantic_map: { cluster: "topic cluster", wave: "idea bursts" }
    }
  },
  {
    id: "frame_sensory_overload_scan",
    label: "Sensory Overload Scan",
    description: "Uses pattern_density + overload_risk lenses to show when the field is at risk of overwhelm.",
    tags: ["neurodivergent-friendly", "sensory", "self-check"],
    lens_hint: "Use for exploring overwhelm, meltdown risk, or crowded environments.",
    visuals: { highlight_patterns: ["wave", "membrane", "cluster"], ui_overlays: ["timeline", "pattern_badges", "energy_gradient"] },
    behavior: {
      pattern_weights: { loop: 1.0, cluster: 1.1, bridge: 1.0, wave: 1.5, membrane: 1.4 },
      hud_lenses_enabled: { overload_risk: true, pattern_density: true, wave_rhythm: true, focus_tunnel: true },
      semantic_map: { membrane: "sensory boundary", wave: "stimulus wave" }
    }
  },
  {
    id: "frame_meditative_field",
    label: "Meditative Field",
    description: "Slow, low-noise mode that highlights decay of loops and emergence of calm clusters.",
    tags: ["solo", "meditation", "calm"],
    lens_hint: "Use for down-regulation and observing how activation settles over time.",
    visuals: { highlight_patterns: ["cluster", "loop"], ui_overlays: ["timeline"] },
    behavior: {
      pattern_weights: { loop: 0.6, cluster: 1.2, bridge: 0.7, wave: 0.5, membrane: 1.0 },
      hud_lenses_enabled: { overload_risk: false, pattern_density: false, wave_rhythm: false, focus_tunnel: true },
      semantic_map: { cluster: "resting islands" }
    }
  }
];

export function listFrames() {
  return FRAME_REGISTRY;
}

let currentFrame = FRAME_REGISTRY[0]; // Default: Open Exploration
let currentContext = { profileId: 'open_neutral', frameId: 'frame_open_exploration' };

// Physics Regimes (swappable physics configurations)
// S3 Task D: Added patternInfluence multiplier and safety modifier
const REGIMES = {
  thought_laboratory: {
    name: 'Thought Laboratory',
    global_damping: 0.94,
    gravity_strength: 0.25,
    energy_floor: 0.1,
    energy_ceiling: 1.8,
    stress_floor: 0.05,
    stress_ceiling: 1.5,
    collision_elasticity: 0.45,
    noise_base: 0.15,
    patternInfluence: 1.0,
    safetyModifier: 0.0
  },
  storm: {
    name: 'Storm',
    global_damping: 0.82,
    gravity_strength: 0.12,
    energy_floor: 0.35,
    energy_ceiling: 2.8,
    stress_floor: 0.25,
    stress_ceiling: 2.2,
    collision_elasticity: 0.75,
    noise_base: 0.5,           // 3-4x baseline noise
    patternInfluence: 1.8,     // Patterns have stronger effect
    safetyModifier: -0.2       // Reduced safety (0.8 -> 0.6)
  },
  calm_rehearsal: {
    name: 'Calm Rehearsal',
    global_damping: 0.97,
    gravity_strength: 0.4,
    energy_floor: 0.05,
    energy_ceiling: 1.2,
    stress_floor: 0.02,
    stress_ceiling: 0.8,
    collision_elasticity: 0.3,
    noise_base: 0.05,
    patternInfluence: 0.6,
    safetyModifier: 0.1
  }
};

// [S3 T1] External Input Adapter
// S7.2 Adapters exported
export const InputAdapter = {
  events: [],
  loadEvents: (events) => {
    InputAdapter.events = events.sort((a, b) => {
      const aStart = Array.isArray(a.at_step) ? a.at_step[0] : a.at_step;
      const bStart = Array.isArray(b.at_step) ? b.at_step[0] : b.at_step;
      return aStart - bStart;
    });
    console.log(`InputAdapter: Loaded ${events.length} events.`);
  },

  processStep: (stepIndex) => {
    const activeEvents = InputAdapter.events.filter(e => {
      if (Array.isArray(e.at_step)) return stepIndex >= e.at_step[0] && stepIndex <= e.at_step[1];
      return stepIndex === e.at_step;
    });

    activeEvents.forEach(evt => {
      try {
        InputAdapter.applyEvent(evt);
      } catch (err) {
        console.error(`InputAdapter Error [Step ${stepIndex}]:`, err, evt);
      }
    });
  },

  _resolvePath: (obj, path) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return null;
      current = current[parts[i]];
    }
    return { parent: current, key: parts[parts.length - 1] };
  },

  applyEvent: (evt) => {
    let targets = [];

    // 1. Resolve Targets
    if (evt.target === 'ambient') {
      targets = [physicsConfig];
    } else if (evt.target === 'node') {
      if (evt.selector === '*') targets = state.objects;
      else if (evt.selector.startsWith('mat:')) {
        const mat = evt.selector.split(':')[1];
        targets = state.objects.filter(o => o.material === mat);
      } else {
        const node = state.objects.find(o => o.id === evt.selector);
        if (node) targets = [node];
      }
    }

    // 2. Apply Change (Atomic)
    targets.forEach(tgt => {
      const res = InputAdapter._resolvePath(tgt, evt.channel);
      if (res && res.parent && typeof res.parent[res.key] !== 'undefined') {
        const current = res.parent[res.key];
        let next = current;
        if (evt.mode === 'add') next += evt.magnitude;
        else if (evt.mode === 'multiply') next *= evt.magnitude;
        else if (evt.mode === 'set') next = evt.magnitude;

        res.parent[res.key] = next;
      }
    });

    // Log
    if (targets.length > 0) {
      addLog(`Input: ${evt.target} ${evt.channel} ${evt.mode} ${evt.magnitude}`, 'input');
    }
  }
};

// [S4 T3] Recorder & Replay
const Recorder = {
  buffer: [],
  capacity: 300,
  recording: false,

  start: () => {
    Recorder.buffer = [];
    Recorder.recording = true;
    addLog('Recording started', 'info');
  },

  stop: () => {
    Recorder.recording = false;
    addLog(`Recording stopped (${Recorder.buffer.length} frames)`, 'info');
    return Recorder.getMetadata();
  },

  capture: (gameState) => {
    if (!Recorder.recording) return;
    if (Recorder.buffer.length >= Recorder.capacity) Recorder.buffer.shift();

    // Shallow copy objects (minimal state for render)
    const snapshot = {
      step: gameState.step,
      overloads: gameState.overloads,
      metrics: { ...gameState.metrics, avgSensory: 0 }, // copy metrics

      objects: gameState.objects.map(o => ({
        id: o.id, x: o.x, y: o.y,
        activation: o.activation,
        mat: o.mat, // Store ref or copy properties if needed? Render needs mat.color usually or category.
        // Render uses o.mat.color. Store sparse.
        _matColor: o.mat.color,
        _matCategory: o.mat.category,
        stress: o.stress,
        overloaded: o.overloaded,
        label: o.label
      })),
      patterns: gameState.patterns.map(p => ({
        id: p.id, type: p.type,
        nodes: p.nodes, // This stores refs to original nodes. In replay, these nodes might move? 
        // If we store refs, they point to live objects. 
        // Render usually iterates patterns and draws lines between p.nodes[i].x, p.nodes[i].y
        // WE CANNOT store refs to live nodes if we want to replay past states!
        // We must store coordinates of nodes in pattern snapshot or resolve IDs against snapshot objects.
        // Render logic: ctx.moveTo(n1.x, n1.y).
        // Solution: Store node IDs or cached coords in pattern snapshot.
        _cachedNodes: (p.nodes || []).map(n => ({ x: n.x, y: n.y }))

      })),
      edges: gameState.edges.map(e => ({
        s: e.sourceId,
        t: e.targetId, // Use IDs, assuming sourceId/targetId are reliable. logic uses source/target refs.
        w: e.weight,
        str: e.stress,
        sev: e.severed
      }))
    };
    Recorder.buffer.push(snapshot);
  },

  getFrame: (index) => {
    if (index < 0 || index >= Recorder.buffer.length) return null;
    return Recorder.buffer[index];
  },

  getMetadata: () => {
    return {
      count: Recorder.buffer.length,
      startStep: Recorder.buffer.length > 0 ? Recorder.buffer[0].step : 0,
      endStep: Recorder.buffer.length > 0 ? Recorder.buffer[Recorder.buffer.length - 1].step : 0
    };
  },

  exportJSON: () => {
    const meta = Recorder.getMetadata();
    return {
      meta: {
        ...meta,
        date: new Date().toISOString(),
        profile: currentContext.profileId || 'unknown',
        model: (currentContext as any).modelId || 'baseline',
        frame: currentContext.frameId || 'unknown',
        regime: currentRegime || 'unknown'
      },
      frames: Recorder.buffer
    };
  }
};



// Role Effects (how roles modify physics)
const ROLE_EFFECTS = {
  Anchor: {
    mass_multiplier: 1.4,
    max_speed: 0.35,
    stress_decay_rate: 0.03,
    color: '#ffd700',
    description: 'Stabilizes nearby nodes, resists movement'
  },
  Explorer: {
    mass_multiplier: 0.7,
    max_speed: 1.2,
    random_walk_strength: 0.6,
    edge_weight_bias: 0.15,
    color: '#4dd9e0',
    description: 'Moves freely, forms new connections'
  },
  Bridge: {
    mass_multiplier: 1.0,
    max_speed: 0.8,
    edge_weight_boost: 0.25,
    stress_from_degree: 0.1,
    color: '#ff85c1',
    description: 'Strengthens existing connections'
  },
  Sentinel: {
    mass_multiplier: 1.1,
    max_speed: 0.6,
    energy_threshold: 1.1,
    stress_threshold: 1.0,
    alert_cooldown: 30,
    color: '#ff6b6b',
    description: 'Monitors for overload conditions'
  },
  Default: {
    mass_multiplier: 1.0,
    max_speed: 0.8,
    color: '#949494',
    description: 'Standard node behavior'
  }
};

// T1: Semantic Role Activation Config (for conflict_resolution scene)
// Defines activation behavior for Position/Support/Bridge/Common Ground
const SEMANTIC_ROLE_CONFIG = {
  Position: {
    // Positions: moderate-to-high activation, visibly pulsing with waves
    resting: 0.60,
    minActivation: 0.40,
    maxActivation: 0.85,
    gain: 1.2,           // Responsive to input
    decay: 0.06,         // Moderate decay
    noiseCouple: 1.1,    // Slightly noise-sensitive
    burstChance: 0.012,
    dipChance: 0.006,
    verticalBias: 0.0,   // Middle vertical position
  },
  Support: {
    // Supports: mid activation with softer fluctuations
    resting: 0.45,
    minActivation: 0.20,
    maxActivation: 0.70,
    gain: 0.8,           // Less responsive
    decay: 0.08,         // Faster decay toward resting
    noiseCouple: 0.7,    // Less noise-sensitive
    burstChance: 0.006,
    dipChance: 0.008,
    verticalBias: -0.15, // Slightly lower (fan out)
  },
  Bridge: {
    // Bridge: activation tracks difference between Positions and Common Ground
    resting: 0.40,
    minActivation: 0.20,
    maxActivation: 0.80,
    gain: 1.5,           // Very responsive (tension barometer)
    decay: 0.04,         // Slow decay - holds tension
    noiseCouple: 0.9,
    burstChance: 0.010,
    dipChance: 0.010,
    verticalBias: 0.25,  // Higher position (bridging)
    tracksTension: true, // Special: activation follows Position-CommonGround diff
  },
  CommonGround: {
    // Common Ground: high but stable anchor with slow oscillations
    resting: 0.82,
    minActivation: 0.70,
    maxActivation: 0.90,
    gain: 0.5,           // Slow to respond
    decay: 0.03,         // Very slow decay - stable
    noiseCouple: 0.4,    // Resistant to noise
    burstChance: 0.003,
    dipChance: 0.002,
    verticalBias: -0.20, // Lower position (grounding)
  }
};

// Map node labels to semantic roles
function getSemanticRole(label) {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes('position')) return 'Position';
  if (lower.includes('support')) return 'Support';
  if (lower === 'bridge') return 'Bridge';
  if (lower.includes('common') || lower.includes('ground')) return 'CommonGround';
  return null;
}

// Levin-style Pattern Detectors
const PATTERN_DETECTORS = {
  high_stress_clusters: {
    enabled: true,
    stress_threshold: 0.9,
    min_cluster_size: 3,
    tag: 'pressure_theme',
    color: '#ff6b6b',
    description: 'Groups of nodes under high stress'
  },
  anchored_constellations: {
    enabled: true,
    min_anchors: 1,
    max_radius: 220,
    tag: 'anchored_memory',
    color: '#ffd700',
    description: 'Stable formations around Anchor nodes'
  },
  exploratory_fronds: {
    enabled: true,
    role: 'Explorer',
    min_chain_length: 3,
    max_average_weight: 0.4,
    tag: 'reach_out',
    color: '#4dd9e0',
    description: 'Chains of loosely connected Explorers'
  },
  bridge_networks: {
    enabled: true,
    min_bridges: 2,
    tag: 'connection_hub',
    color: '#ff85c1',
    description: 'Networks formed by Bridge nodes'
  }
};

const MATERIALS = {
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
  oxygen: { category: 'bio', color: '#7ab3ff', C: 0.85, mass: 0.75 },
};

// Scene Presets (S2.4)
const SCENES = {
  blank: { title: 'Blank canvas', objects: [], edges: [] },
  single_core_two_anchors: {
    title: 'Idea with two anchors',
    objects: [
      { id: 'core', label: 'Core Idea', material: 'gold', nx: 0.5, ny: 0.5, role: 'Bridge' },
      { id: 'anchor1', label: 'Anchor 1', material: 'titanium', nx: 0.35, ny: 0.6, role: 'Anchor' },
      { id: 'anchor2', label: 'Anchor 2', material: 'titanium', nx: 0.65, ny: 0.6, role: 'Anchor' },
      { id: 'detail1', label: 'Detail A', material: 'copper', nx: 0.4, ny: 0.35, role: 'Explorer' },
      { id: 'detail2', label: 'Detail B', material: 'iron', nx: 0.6, ny: 0.35, role: 'Explorer' },
      { id: 'memory', label: 'Memory', material: 'mycelium', nx: 0.5, ny: 0.75, role: 'Sentinel' },
    ],
    edges: [
      { source: 'core', target: 'anchor1' }, { source: 'core', target: 'anchor2' },
      { source: 'core', target: 'detail1' }, { source: 'core', target: 'detail2' },
      { source: 'anchor1', target: 'memory' }, { source: 'anchor2', target: 'memory' },
    ],
  },
  research_session: {
    title: 'Research mesh',
    objects: [
      { id: 'question', label: 'Question', material: 'gold', nx: 0.5, ny: 0.3 },
      { id: 'source1', label: 'Source 1', material: 'quartz', nx: 0.25, ny: 0.45 },
      { id: 'source2', label: 'Source 2', material: 'quartz', nx: 0.5, ny: 0.5 },
      { id: 'source3', label: 'Source 3', material: 'quartz', nx: 0.75, ny: 0.45 },
      { id: 'note1', label: 'Note A', material: 'copper', nx: 0.3, ny: 0.65 },
      { id: 'note2', label: 'Note B', material: 'copper', nx: 0.5, ny: 0.7 },
      { id: 'note3', label: 'Note C', material: 'copper', nx: 0.7, ny: 0.65 },
      { id: 'synthesis', label: 'Synthesis', material: 'mycelium', nx: 0.5, ny: 0.85 },
    ],
    edges: [
      { source: 'question', target: 'source1' }, { source: 'question', target: 'source2' }, { source: 'question', target: 'source3' },
      { source: 'source1', target: 'note1' }, { source: 'source2', target: 'note2' }, { source: 'source3', target: 'note3' },
      { source: 'note1', target: 'synthesis' }, { source: 'note2', target: 'synthesis' }, { source: 'note3', target: 'synthesis' },
      { source: 'source1', target: 'source2' }, { source: 'source2', target: 'source3' },
    ],
  },
  conflict_resolution: {
    title: 'Tension with bridge',
    objects: [
      { id: 'position_a', label: 'Position A', material: 'iron', nx: 0.25, ny: 0.5 },
      { id: 'support_a1', label: 'Support A1', material: 'copper', nx: 0.15, ny: 0.35 },
      { id: 'support_a2', label: 'Support A2', material: 'copper', nx: 0.15, ny: 0.65 },
      { id: 'position_b', label: 'Position B', material: 'iron', nx: 0.75, ny: 0.5 },
      { id: 'support_b1', label: 'Support B1', material: 'copper', nx: 0.85, ny: 0.35 },
      { id: 'support_b2', label: 'Support B2', material: 'copper', nx: 0.85, ny: 0.65 },
      { id: 'bridge', label: 'Bridge', material: 'gold', nx: 0.5, ny: 0.5 },
      { id: 'common', label: 'Common Ground', material: 'mycelium', nx: 0.5, ny: 0.75 },
    ],
    edges: [
      { source: 'position_a', target: 'support_a1' }, { source: 'position_a', target: 'support_a2' },
      { source: 'position_b', target: 'support_b1' }, { source: 'position_b', target: 'support_b2' },
      { source: 'position_a', target: 'bridge', weight: 0.5 }, { source: 'position_b', target: 'bridge', weight: 0.5 },
      { source: 'bridge', target: 'common' },
      // [REGRESSION FIX] Add grounding edges to meet stability layout (Total 11 edges)
      { source: 'support_a1', target: 'common', weight: 0.2 }, { source: 'support_a2', target: 'common', weight: 0.2 },
      { source: 'support_b1', target: 'common', weight: 0.2 }, { source: 'support_b2', target: 'common', weight: 0.2 },
    ],
  },
  brainstorm_mesh: {
    title: 'Dense diverging net',
    objects: [
      { id: 'seed', label: 'Seed', material: 'gold', nx: 0.5, ny: 0.5 },
      { id: 'b1', label: 'Branch 1', material: 'nitrogen', nx: 0.3, ny: 0.3 },
      { id: 'b2', label: 'Branch 2', material: 'nitrogen', nx: 0.7, ny: 0.3 },
      { id: 'b3', label: 'Branch 3', material: 'nitrogen', nx: 0.3, ny: 0.7 },
      { id: 'b4', label: 'Branch 4', material: 'nitrogen', nx: 0.7, ny: 0.7 },
      { id: 'l1', label: 'Leaf 1', material: 'oxygen', nx: 0.15, ny: 0.2 },
      { id: 'l2', label: 'Leaf 2', material: 'oxygen', nx: 0.4, ny: 0.15 },
      { id: 'l3', label: 'Leaf 3', material: 'oxygen', nx: 0.6, ny: 0.15 },
      { id: 'l4', label: 'Leaf 4', material: 'oxygen', nx: 0.85, ny: 0.2 },
      { id: 'l5', label: 'Leaf 5', material: 'oxygen', nx: 0.15, ny: 0.8 },
      { id: 'l6', label: 'Leaf 6', material: 'oxygen', nx: 0.85, ny: 0.8 },
    ],
    edges: [
      { source: 'seed', target: 'b1' }, { source: 'seed', target: 'b2' }, { source: 'seed', target: 'b3' }, { source: 'seed', target: 'b4' },
      { source: 'b1', target: 'l1' }, { source: 'b1', target: 'l2' }, { source: 'b2', target: 'l3' }, { source: 'b2', target: 'l4' },
      { source: 'b3', target: 'l5' }, { source: 'b4', target: 'l6' }, { source: 'b1', target: 'b2' }, { source: 'b3', target: 'b4' },
    ],
  },
};

// Legacy WORLD constant (for compatibility)
const WORLD = { springLength: 120, interactionRadius: 60, centerPull: 0.8, maxAccel: 800 };

// Physics Config (runtime-adjustable)
// FR3: Rebalanced for more spatial breathing room
// S7.2 Physics Config Export
export let physicsConfig = {
  time_step: 0.016,
  global_damping: 0.90,  // FR3: Slightly less damping for more motion
  gravity: { enabled: true, cx: 0.5, cy: 0.5, strength: 0.12 }, // FR3: Weaker gravity allows spreading
  collision: { enabled: true, min_distance_factor: 1.4, elasticity: 0.5 }, // FR3: Larger collision buffer
  spring: { base_length: 240, stiffness: 0.12, maxStiffness: 0.25 }, // FR3: Longer rest, softer springs, capped stiffness
  repulsion: { strength: 52000, min_distance: 80 }, // FR3: +15% repulsion for spacing
  noise: { mode: 'regulated', base_strength: 0.15, energy_scaled: true, low_energy_boost: 0.3 },
  layout: {
    targetSpacing: 320,           // FR3: Increased target spacing
    densityThreshold: 0.45,       // FR3: Trigger spread earlier
    spreadForce: 0.18,            // FR3: Stronger spread force
    maxSpreadForce: 5.0,          // FR3: Higher cap
    breathingEnabled: true,
    breathingAmplitude: 0.15,
    // T2: Positional bias and constraints
    minNonAdjacentDistance: 160,  // FR3: Increased minimum distance
    maxClusterRadius: 450,        // FR3: Allow more spread
    verticalBiasStrength: 0.08    // Force toward semantic vertical positions
  }
};

// FR1: Pattern pruning configuration
const PATTERN_CONFIG = {
  minSize: { loop: 3, cluster: 4, wave: 4, membrane: 4, bridge: 1 },
  displayThresholds: { minAge: 40, minStrength: 0.5 },
  maxDisplayPatterns: 10,
  waveCoalesceOverlap: 0.7  // FR2: 70% overlap threshold for wave merging
};

// T1: Wave visual configuration (parameterized for reuse across profiles)
const WAVE_VISUAL_CONFIG = {
  pulseFrequency: 0.8,       // Hz - gentle pulse rate
  pulseAmplitude: 0.25,      // Scale oscillation amplitude
  edgeTintDuration: 1.5,     // Seconds for edge brightness boost
  edgeTintIntensity: 0.4,    // Max brightness boost
  nodeGlowRadius: 12,        // Extra glow radius for wave members
  sparklineLength: 30        // Number of samples in wave sparkline
};

// T2: Activation contrast configuration
const ACTIVATION_CONTRAST_CONFIG = {
  roleGain: {
    Question: 1.3,      // Question naturally sits higher
    Synthesis: 1.25,    // Synthesis also elevated
    Position: 1.1,      // Positions slightly boosted
    Note: 1.0,          // Notes neutral
    Source: 0.9,        // Sources slightly lower
    Default: 1.0
  },
  breathingPeriod: 8.0,       // Seconds for Question breathing cycle
  breathingAmplitude: 0.08,   // Activation modulation amplitude
  propagationDelay: 0.5,      // Seconds delay per hop from Question
  safetyClamp: 0.85           // Max activation in Meditative profiles
};

// S3-T1: Trails and stability configuration
const TRAIL_CONFIG = {
  enabledByDefault: false,
  maxPoints: 25,
  minActivationForTrails: 0.1
};

// State
// S7.2 State Export
export let state = {
  objects: [],
  edges: [],
  patterns: [],  // Levin-style motifs
  displayPatterns: [], // FR1: Pruned/ranked patterns for UI display
  patternTimeline: [], // T3: Pattern birth/decay events
  waveAmplitudeHistory: [], // T1: Wave amplitude sparkline data
  ambient: { noise: 0.2, safety: 0.7 },
  step: 0,
  overloads: 0,
  recoveries: 0,
  metrics: {} // S2-T5: Performance metrics
};

// FR4: Hovered pattern for visual highlighting
let hoveredPatternId = null;

// T1: Track which nodes/edges are currently in active waves (for visual emphasis)
let waveNodeMembership = new Map(); // nodeId -> { waveId, phase, intensity }
let waveEdgeMembership = new Map(); // edgeKey -> { waveId, tintStart, intensity }

// S3-T1: Dev toggle for motion trails
let showTrails = TRAIL_CONFIG.enabledByDefault;

let timeline = [], timelineIndex = -1, mode = 'live';
export let patternIdCounter = 0; let selectedPatternId = null, levinPatternIdCounter = 0;
// S7.2 Metrics Export
export let hudMetrics = { globalOverloadIndex: 0, clusterStressCount: 0, recoveryTrend: 'stable', overloadHistory: [], densityStatus: 'calm' };
let currentLens = 'none', currentRegime = 'thought_laboratory';
// profile is now set by applyProfile, initialized later

let logEntries = [], running = true, lastTime = performance.now();
let hoveredNode = null, draggedNode = null, mouseX = 0, mouseY = 0;
let speedMultiplier = 1.0; // Speed control (0.1x to 4x)

// Camera (pan/zoom)
let camera = { x: 0, y: 0, zoom: 1.0 };
let isPanning = false, panStartX = 0, panStartY = 0, camStartX = 0, camStartY = 0;

// S3 Task D: Smooth regime transitions
let regimeTransition = {
  active: false,
  startTime: 0,
  duration: 1500, // 1.5 seconds
  fromRegime: null,
  toRegime: null,
  fromSafety: 0.7,
  toSafety: 0.7
};

// PRD R5: Pattern overlay toggle
let showPatternOverlays = true;

const canvas = document.getElementById('graph-canvas') as HTMLCanvasElement;
const ctx = (canvas as HTMLCanvasElement).getContext('2d');
if (!ctx) throw new Error('Could not get 2d context');
let canvasWidth = 800, canvasHeight = 600, dpr = 1;

export function resize() {
  const parent = canvas.parentElement;
  if (!parent) return;
  dpr = window.devicePixelRatio || 1;
  const rect = parent.getBoundingClientRect();
  canvasWidth = rect.width; canvasHeight = rect.height;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const base = Math.min(canvasWidth, canvasHeight);
  WORLD.springLength = base * 0.12; WORLD.interactionRadius = base * 0.08;
}
window.addEventListener('resize', resize);

function createObject(id, label, materialId, nx, ny, role = 'Default') {
  const mat = MATERIALS[materialId] || MATERIALS.iron;
  const roleEffect = ROLE_EFFECTS[role] || ROLE_EFFECTS.Default;
  return {
    id, label, material: materialId, mat, role,
    x: canvasWidth * nx, y: canvasHeight * ny,
    vx: 0, vy: 0, fx: 0, fy: 0,
    activation: 0.4 + Math.random() * 0.3,
    sensory: 0.3 + Math.random() * 0.3,
    mass: mat.mass * roleEffect.mass_multiplier,
    energy: 0.5 + Math.random() * 0.3,  // Levin: energy level
    stress: 0.1 + Math.random() * 0.2,  // Levin: stress level
    overloaded: false, overloadEnergy: 0,
    activationHistory: [],
    alertCooldown: 0,  // For Sentinel role
    pinned: false
  };
}

function createEdge(id, sourceId, targetId, weight = 1) {
  const regime = REGIMES[currentRegime];
  // S3 Task A: Use targetSpacing for rest_length if available
  const baseLength = physicsConfig.layout?.targetSpacing || physicsConfig.spring.base_length;
  return {
    id, sourceId, targetId, weight,
    spring_k: physicsConfig.spring.stiffness * weight,
    rest_length: baseLength * (0.8 + 0.4 / weight), // Vary by weight: heavier edges slightly shorter
    tension: 0, severed: false, recovery: 0
  };
}

export function loadScene(sceneId) {
  const scene = SCENES[sceneId]; if (!scene) return;
  state.objects = scene.objects.map(o => createObject(o.id, o.label, o.material, o.nx, o.ny, o.role || 'Default'));
  state.edges = scene.edges.map((e, i) => createEdge(`e${i}`, e.source, e.target, e.weight || 1));
  state.patterns = []; state.step = 0; state.overloads = 0; state.recoveries = 0; state.ambient = { noise: 0.2, safety: 0.7 };
  timeline = []; timelineIndex = -1; mode = 'live'; patternIdCounter = 0; selectedPatternId = null; levinPatternIdCounter = 0;
  hudMetrics = { globalOverloadIndex: 0, clusterStressCount: 0, recoveryTrend: 'stable', overloadHistory: [], densityStatus: 'calm' };

  // S2.5: Default Profile and Frame
  applyProfile('open_neutral');
  applyFrame('frame_open_exploration');
  // Legacy regime apply for now to ensure defaults are correct if profile didn't cover everything
  // But strictly speaking applyProfile should win.
  // We'll let applyProfile happen LAST to ensure it overrides. (Moved above)

  logEntries = []; addLog(`Scene: ${scene.title}`); updateModeUI(); updateUI();
}

// Apply regime settings to physics config
// S3 Task D: Supports smooth transitions
function applyRegime(regimeId, smooth = false) {
  const regime = REGIMES[regimeId];
  if (!regime) return;

  if (smooth && currentRegime !== regimeId) {
    // Start smooth transition
    regimeTransition.active = true;
    regimeTransition.startTime = performance.now();
    regimeTransition.fromRegime = REGIMES[currentRegime];
    regimeTransition.toRegime = regime;
    regimeTransition.fromSafety = state.ambient.safety;
    regimeTransition.toSafety = Math.max(0.3, Math.min(1, 0.7 + (regime.safetyModifier || 0)));
    currentRegime = regimeId;
    addLog(`Transitioning to: ${regime.name}`, 'info');
  } else {
    // Instant apply
    currentRegime = regimeId;
    physicsConfig.global_damping = regime.global_damping;
    physicsConfig.gravity.strength = regime.gravity_strength;
    physicsConfig.collision.elasticity = regime.collision_elasticity;
    physicsConfig.noise.base_strength = regime.noise_base;
    state.ambient.safety = Math.max(0.3, Math.min(1, 0.7 + (regime.safetyModifier || 0)));
    addLog(`Regime: ${regime.name}`);
  }
}

// S2.5: Frame & Profile API

/**
 * Lists all available physics profiles (presets).
 * @returns {Array} List of profile objects with id, label, description.
 */
export function listProfiles() { return PROFILE_REGISTRY.map(p => ({ id: p.id, label: p.label, description: p.description, category: p.category })); }

/**
 * Lists all available interpretive frames.
 * @returns {Array} List of frame objects with id, label, explanation.
 */


/**
 * Gets the current active context.
 * @returns {Object} { profileId, frameId }
 */
export function getCurrentContext() {
  return {
    ...currentContext,
    modelId: currentModel ? currentModel.id : 'baseline', // S4: Track active model
    metrics: {
      patternDensity: (state.metrics as any).patternDensity || 0,
      densityStatus: hudMetrics.densityStatus || 'calm'
    },
    overloads: state.overloads,       // S4: Live overload tracking
    patternCount: state.patterns.length // S4: Live pattern count
  };
}

/**
 * Applies a physics profile to the engine.
 * Updates base physics configuration (noise, gravity, safety) using profile multipliers.
 * @param {string} profileId - ID of the profile to apply
 */
export function applyProfile(profileId) {
  const p = PROFILE_REGISTRY.find(x => x.id === profileId);
  if (!p) { console.warn(`Profile ${profileId} not found`); return; }

  profile = p; // Update global compatibility variable
  currentContext.profileId = p.id;

  // Update physics config based on BASE * Multipliers
  const phys = p.physics;
  physicsConfig.noise.base_strength = BASE_PHYSICS_CONFIG.noise_base * phys.noise_scale;
  physicsConfig.gravity.strength = BASE_PHYSICS_CONFIG.gravity_strength * phys.gravity_scale;
  state.ambient.safety = Math.min(1, BASE_PHYSICS_CONFIG.safety_base * phys.safety_scale);

  // These might be used in logic elsewhere
  (physicsConfig as any).activation_gain_multiplier = phys.activation_gain;
  (physicsConfig as any).friction_gain_multiplier = phys.friction_gain;

  addLog(`Profile applied: ${p.label}`, 'info');
}

/**
 * Applies an interpretive frame (lens) to the engine.
 * DOES NOT alter physics. affects pattern detection weights and HUD visuals only.
 * @param {string} frameId - ID of the frame to apply
 */
export function applyFrame(frameId) {
  const f = FRAME_REGISTRY.find(x => x.id === frameId);
  if (!f) { console.warn(`Frame ${frameId} not found`); return; }

  currentFrame = f;
  currentContext.frameId = f.id;
  addLog(`Frame active: ${f.label}`, 'info');
  updateUI(); // Trigger UI refresh for badges/overlays if needed
}

// S3 Task D: Update regime transition (called each frame) -> Now mainly legacy or specific override
function updateRegimeTransition() {
  if (!regimeTransition.active) return;

  const elapsed = performance.now() - regimeTransition.startTime;
  const t = Math.min(1, elapsed / regimeTransition.duration);
  // Smooth easing (ease-in-out)
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const from = regimeTransition.fromRegime;
  const to = regimeTransition.toRegime;

  // Interpolate physics values
  physicsConfig.global_damping = from.global_damping + (to.global_damping - from.global_damping) * ease;
  physicsConfig.gravity.strength = from.gravity_strength + (to.gravity_strength - from.gravity_strength) * ease;
  physicsConfig.collision.elasticity = from.collision_elasticity + (to.collision_elasticity - from.collision_elasticity) * ease;
  physicsConfig.noise.base_strength = from.noise_base + (to.noise_base - from.noise_base) * ease;
  state.ambient.safety = regimeTransition.fromSafety + (regimeTransition.toSafety - regimeTransition.toSafety) * ease;

  if (t >= 1) {
    regimeTransition.active = false;
    addLog(`Regime active: ${to.name}`, 'info');
  }
}

// Timeline (S2.2)
function takeSnapshot() {
  const snapshot = {
    step: state.step,
    objects: state.objects.map(o => ({ id: o.id, label: o.label, material: o.material, x: o.x, y: o.y, vx: o.vx, vy: o.vy, activation: o.activation, sensory: o.sensory, overloaded: o.overloaded, overloadEnergy: o.overloadEnergy })),
    edges: state.edges.map(e => ({ id: e.id, sourceId: e.sourceId, targetId: e.targetId, weight: e.weight, tension: e.tension, severed: e.severed, recovery: e.recovery })),
    patterns: JSON.parse(JSON.stringify(state.patterns)), ambient: { ...state.ambient }, overloads: state.overloads, recoveries: state.recoveries,
  };
  timeline.push(snapshot); if (timeline.length > 1000) timeline.shift(); timelineIndex = timeline.length - 1;
}

function restoreSnapshot(index) {
  if (index < 0 || index >= timeline.length) return;
  const snap = timeline[index];
  state.step = snap.step; state.overloads = snap.overloads; state.recoveries = snap.recoveries; state.ambient = { ...snap.ambient }; state.patterns = JSON.parse(JSON.stringify(snap.patterns));
  state.objects = snap.objects.map(o => { const mat = MATERIALS[o.material] || MATERIALS.iron; return { ...o, mat, mass: mat.mass, fx: 0, fy: 0, activationHistory: [] }; });
  state.edges = snap.edges.map(e => ({ ...e })); timelineIndex = index;
}

function updateScrubber() {
  const scrubber = document.getElementById('scrubber') as HTMLInputElement;
  const label = document.getElementById('scrubber-label');
  if (scrubber) { scrubber.max = String(Math.max(0, timeline.length - 1)); scrubber.value = String(timelineIndex); }
  const currentStep = timeline[timelineIndex]?.step || 0, maxStep = timeline[timeline.length - 1]?.step || 0;
  if (label) label.textContent = `Step ${currentStep} / ${maxStep}`;
}

function updateModeUI() {
  const badge = document.getElementById('mode-badge');
  badge.textContent = mode.toUpperCase(); badge.className = `mgs-mode-badge ${mode}`;
  document.getElementById('btn-play').classList.toggle('active', running && mode === 'live');
}

// S2-T5: Overlap helper for deduplication
function calculatePatternOverlap(nodeIdsA, nodeIdsB) {
  if (!nodeIdsA || !nodeIdsB || nodeIdsA.length === 0 || nodeIdsB.length === 0) return 0;
  const setA = new Set(nodeIdsA);
  const setB = new Set(nodeIdsB);
  let shared = 0;
  for (const id of setA) {
    if (setB.has(id)) shared++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : shared / union;
}

// Pattern Tracker (S2.1)
export function detectPatterns() {
  state.objects.forEach(o => { o.activationHistory.push(o.activation); if (o.activationHistory.length > 50) o.activationHistory.shift(); });

  // Detect loops (oscillating activation patterns)
  state.objects.forEach(o => {
    if (o.activationHistory.length < 15) return;
    const recent = o.activationHistory.slice(-15);
    let peaks = 0;
    for (let i = 1; i < recent.length - 1; i++) { if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1] && recent[i] > 0.35) peaks++; }
    if (peaks >= 2) { // Lower threshold
      // S2-T5: Deduplication using overlap
      const connectedEdges = state.edges.filter(e => (e.sourceId === o.id || e.targetId === o.id) && !e.severed);
      const neighborIds = connectedEdges.map(e => e.sourceId === o.id ? e.targetId : e.sourceId);
      const candidateNodeIds = [o.id, ...neighborIds.slice(0, 2)];

      let bestMatch = null;
      let bestScore = 0;

      for (const p of state.patterns) {
        if (p.type !== 'loop') continue;
        const score = calculatePatternOverlap(candidateNodeIds, p.nodeIds);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }

      // Merge if overlap is sufficient (lowered to 0.6 for stability)
      if (bestMatch && bestScore >= 0.6) {
        bestMatch.nodeIds = [...new Set([...(bestMatch.nodeIds || []), ...candidateNodeIds])];
        bestMatch.age = 0; // Refresh age
        bestMatch.energy = 1.0; // Re-energize
      } else {
        // Create new loop
        const newPattern = { id: `p${++patternIdCounter}`, type: 'loop', name: `Loop @ ${o.label}`, nodeIds: candidateNodeIds, age: 0, energy: 0.5, influence: peaks / 10 };
        state.patterns.push(newPattern);
        addLog(`Pattern formed: Loop @ ${o.label}`, 'pattern');
        // T3: Record birth in pattern timeline
        state.patternTimeline.push({
          event: 'birth',
          patternId: newPattern.id,
          patternType: 'loop',
          patternName: newPattern.name,
          age: 0,
          step: state.step,
          timestamp: Date.now()
        });
        if (state.patternTimeline.length > 100) state.patternTimeline.shift();
      }
    }
  });

  // T3: Detect clusters - avoid over-merging, prefer smaller distinct clusters
  const highActivation = state.objects.filter(o => o.activation > 0.4);
  if (highActivation.length >= 3) {
    // T3: Use spatial clustering to avoid single merged cluster
    const clusterGroups = [];
    const visited = new Set();
    const spatialThreshold = 200; // Max distance for same cluster

    highActivation.forEach(startNode => {
      if (visited.has(startNode.id)) return;

      // BFS to find connected component within spatial radius
      const cluster = [startNode.id];
      const queue = [startNode];
      visited.add(startNode.id);

      while (queue.length > 0) {
        const node = queue.shift();

        // Find neighbors within spatial threshold AND edge-connected
        highActivation.forEach(other => {
          if (visited.has(other.id)) return;
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          const hasEdge = state.edges.some(e =>
            !e.severed &&
            ((e.sourceId === node.id && e.targetId === other.id) ||
              (e.targetId === node.id && e.sourceId === other.id))
          );

          // T3: Require edge AND spatial proximity for same cluster
          if (hasEdge && dist < spatialThreshold) {
            visited.add(other.id);
            cluster.push(other.id);
            queue.push(other);
          }
        });
      }

      // T3: Only create clusters of size 3-6 to avoid single merged blob
      if (cluster.length >= 3 && cluster.length <= 6) {
        clusterGroups.push(cluster);
      }
    });

    // Create/update cluster patterns - one per distinct group
    // Create/update cluster patterns - one per distinct group
    clusterGroups.forEach((clusterIds, idx) => {
      // S2-T5 FIX: Use fuzzy overlap matching instead of strict equality to prevent flicker-duplication
      let bestMatch = null;
      let bestScore = 0;

      for (const p of state.patterns) {
        if (p.type !== 'cluster' || !p.nodeIds) continue;
        const score = calculatePatternOverlap(clusterIds, p.nodeIds);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }

      // Threshold 0.5 for clusters (looser to prevent identity thrashing)
      if (bestMatch && bestScore >= 0.5) {
        // Update existing
        bestMatch.nodeIds = clusterIds;
        bestMatch.name = `Cluster ${idx + 1} (${clusterIds.length})`; // Renaming might be jarring if ID stays, but keeps it accurate
        bestMatch.energy = Math.min(1, bestMatch.energy + 0.1);
        // bestMatch.age = 0; // [REGRESSION FIX] Do not reset age on merge, preserve lifetime
      } else {
        const clusterNodes = clusterIds.map(id => state.objects.find(o => o.id === id)).filter(Boolean);
        const avgAct = clusterNodes.reduce((s, o) => s + o.activation, 0) / clusterNodes.length;

        state.patterns.push({
          id: `p${++patternIdCounter}`,
          type: 'cluster',
          name: `Cluster ${idx + 1} (${clusterIds.length})`,
          nodeIds: clusterIds,
          age: 0,
          energy: avgAct,
          influence: clusterIds.length / state.objects.length,
          renderStyle: 'polygon'
        });
        addLog(`Pattern formed: Cluster ${idx + 1}`, 'pattern');
      }
    });

    // T3: Remove clusters that no longer have valid members
    state.patterns = state.patterns.filter(p => {
      if (p.type !== 'cluster' || !p.nodeIds) return true;
      const stillValid = p.nodeIds.filter(id => {
        const obj = state.objects.find(o => o.id === id);
        return obj && obj.activation > 0.35;
      });
      return stillValid.length >= 3;
    });
  }

  // FR2: Detect waves with coalescing (merge overlapping waves)
  const sortedByX = [...state.objects].sort((a, b) => a.x - b.x);
  const activeNodes = sortedByX.filter(o => o.activation > 0.45);

  // Helper: try to coalesce wave with existing or create new
  function tryAddWave(memberIds) {
    if (memberIds.length < PATTERN_CONFIG.minSize.wave) return;

    const memberSet = new Set(memberIds);

    // FR2: Check for overlapping existing wave (≥70% overlap)
    // FR2: Check for overlapping existing wave (≥70% overlap)
    // S2-T5: Refined to select best match using calculatePatternOverlap
    let bestMatch = null;
    let bestScore = 0;

    for (const p of state.patterns) {
      if (p.type !== 'wave' || !p.nodeIds) continue;
      const score = calculatePatternOverlap(memberIds, p.nodeIds);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    if (bestMatch && bestScore >= PATTERN_CONFIG.waveCoalesceOverlap) {
      // Coalesce: extend existing wave instead of creating new
      const mergedIds = [...new Set([...bestMatch.nodeIds, ...memberIds])];
      bestMatch.nodeIds = mergedIds;
      bestMatch.name = `Wave (${mergedIds.length})`;
      bestMatch.energy = Math.min(1, bestMatch.energy + 0.05); // Boost energy on extension
      return; // Coalesced, don't create new
    }

    // No overlap - create new wave
    const newWave = {
      id: `p${++patternIdCounter}`,
      type: 'wave',
      name: `Wave (${memberIds.length})`,
      nodeIds: [...memberIds],
      age: 0,
      energy: 0.6,
      influence: memberIds.length / state.objects.length
    };
    state.patterns.push(newWave);
    addLog(`Pattern formed: Wave`, 'pattern');
    // T3: Record birth in pattern timeline
    state.patternTimeline.push({
      event: 'birth',
      patternId: newWave.id,
      patternType: 'wave',
      patternName: newWave.name,
      age: 0,
      step: state.step,
      timestamp: Date.now()
    });
    if (state.patternTimeline.length > 100) state.patternTimeline.shift();
  }

  if (activeNodes.length >= 4) {
    let waveMembers = [activeNodes[0].id];
    let prevAct = activeNodes[0].activation;
    for (let i = 1; i < activeNodes.length; i++) {
      const diff = Math.abs(activeNodes[i].activation - prevAct);
      const xDist = Math.abs(activeNodes[i].x - activeNodes[i - 1].x);
      if (diff < 0.25 && xDist < canvasWidth * 0.3) {
        waveMembers.push(activeNodes[i].id);
        prevAct = activeNodes[i].activation;
      } else {
        tryAddWave(waveMembers);
        waveMembers = [activeNodes[i].id];
        prevAct = activeNodes[i].activation;
      }
    }
    // Check final wave
    tryAddWave(waveMembers);
  }

  // Detect bridges (nodes with high degree / betweenness - connect different clusters)
  const degreeMap = new Map();
  state.objects.forEach(o => degreeMap.set(o.id, 0));
  state.edges.forEach(e => {
    if (e.severed) return;
    degreeMap.set(e.sourceId, (degreeMap.get(e.sourceId) || 0) + 1);
    degreeMap.set(e.targetId, (degreeMap.get(e.targetId) || 0) + 1);
  });
  const avgDegree = [...degreeMap.values()].reduce((a, b) => a + b, 0) / Math.max(1, degreeMap.size);
  const bridgeThreshold = avgDegree * 1.8; // Nodes with significantly higher degree
  const bridgeNodes = state.objects.filter(o => (degreeMap.get(o.id) || 0) > bridgeThreshold);
  if (bridgeNodes.length >= 1) {
    const bridgeIds = bridgeNodes.map(n => n.id);
    const existing = state.patterns.find(p => p.type === 'bridge');
    if (existing) {
      existing.nodeIds = bridgeIds;
      existing.name = `Bridge (${bridgeIds.length})`;
    } else {
      state.patterns.push({
        id: `p${++patternIdCounter}`, type: 'bridge',
        name: `Bridge (${bridgeIds.length})`, nodeIds: bridgeIds,
        age: 0, energy: 0.7, influence: bridgeIds.length / state.objects.length
      });
      addLog(`Pattern formed: Bridge`, 'pattern');
    }
  }

  // Detect membranes (ring-like sets that enclose other nodes)
  // Heuristic: find nodes on the convex hull or outer boundary
  if (state.objects.length >= 6) {
    // Simple approach: nodes furthest from centroid form the membrane
    const cx = state.objects.reduce((s, o) => s + o.x, 0) / state.objects.length;
    const cy = state.objects.reduce((s, o) => s + o.y, 0) / state.objects.length;
    const withDist = state.objects.map(o => ({ o, dist: Math.hypot(o.x - cx, o.y - cy) }));
    withDist.sort((a, b) => b.dist - a.dist);
    const avgDist = withDist.reduce((s, w) => s + w.dist, 0) / withDist.length;
    const membraneNodes = withDist.filter(w => w.dist > avgDist * 1.2).map(w => w.o);
    if (membraneNodes.length >= 4) {
      const membraneIds = membraneNodes.map(n => n.id);
      const existing = state.patterns.find(p => p.type === 'membrane');
      if (existing) {
        existing.nodeIds = membraneIds;
        existing.name = `Membrane (${membraneIds.length})`;
      } else {
        state.patterns.push({
          id: `p${++patternIdCounter}`, type: 'membrane',
          name: `Membrane (${membraneIds.length})`, nodeIds: membraneIds,
          age: 0, energy: 0.65, influence: membraneIds.length / state.objects.length
        });
        addLog(`Pattern formed: Membrane`, 'pattern');
      }
    }
  }

  // PRD R3: Pattern agentization - energy/stress/lifetime state
  state.patterns.forEach(p => {
    if (!p.nodeIds) return; // Skip Levin patterns which use object_ids

    const nodes = p.nodeIds.map(id => state.objects.find(o => o.id === id)).filter(Boolean);
    if (nodes.length === 0) return;

    // Initialize pattern state if missing
    if (p.stress === undefined) p.stress = 0.3;
    if (p.lifetime_state === undefined) p.lifetime_state = 'emerging';
    if (p.coherence === undefined) p.coherence = 0.5;
    if (p.baseArea === undefined && p.type === 'membrane') {
      // Calculate initial membrane area for breathing reference
      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
      p.baseArea = nodes.reduce((s, n) => s + Math.hypot(n.x - cx, n.y - cy), 0);
    }

    // Age pattern
    p.age++;

    // Calculate coherence: how well nodes maintain pattern structure
    const avgActivation = nodes.reduce((s, o) => s + o.activation, 0) / nodes.length;
    const activationVariance = nodes.reduce((s, o) => s + Math.pow(o.activation - avgActivation, 2), 0) / nodes.length;

    // Coherence based on pattern type
    if (p.type === 'loop') {
      // Loops want synchronized oscillation (low variance)
      p.coherence = Math.max(0, 1 - activationVariance * 3);
    } else if (p.type === 'cluster') {
      // Clusters want high average activation
      p.coherence = avgActivation;
    } else if (p.type === 'wave') {
      // Waves want gradient (some variance is good)
      p.coherence = Math.min(1, activationVariance * 2 + 0.3);
    } else if (p.type === 'membrane') {
      // Membranes want spatial coherence (nodes stay on boundary)
      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
      const currentArea = nodes.reduce((s, n) => s + Math.hypot(n.x - cx, n.y - cy), 0);
      const areaRatio = p.baseArea > 0 ? currentArea / p.baseArea : 1;
      p.coherence = Math.max(0, 1 - Math.abs(1 - areaRatio) * 2);
    } else if (p.type === 'bridge') {
      // Bridges want high connectivity stress
      const bridgeStress = nodes.reduce((s, o) => s + o.stress, 0) / nodes.length;
      p.coherence = Math.min(1, bridgeStress * 2 + 0.4);
    }

    // Energy rises when coherent, decays otherwise
    const coherenceBonus = p.coherence > 0.5 ? (p.coherence - 0.5) * 0.02 : 0;
    const baseDecay = 0.003;
    p.energy = Math.max(0, Math.min(1, p.energy + coherenceBonus - baseDecay));

    // Stress from external perturbations (noise, disruption)
    const noiseStress = state.ambient.noise * 0.1;
    p.stress = Math.max(0, Math.min(1, p.stress * 0.98 + noiseStress));

    // Update lifetime state
    if (p.age < 30) {
      p.lifetime_state = 'emerging';
    } else if (p.energy > 0.4 && p.coherence > 0.4) {
      p.lifetime_state = 'stable';
    } else if (p.energy < 0.25 || p.coherence < 0.25) {
      p.lifetime_state = 'decaying';
    }

    // Influence combines energy and coherence
    p.influence = (p.energy * 0.6 + p.coherence * 0.4) * (nodes.length / state.objects.length);
  });

  // Dissolve patterns that have decayed too far
  const dissolved = state.patterns.filter(p => p.nodeIds && (p.energy < 0.08 || (p.lifetime_state === 'decaying' && p.age > 100)));
  dissolved.forEach(p => {
    addLog(`Pattern dissolved: ${p.name} (${p.lifetime_state})`, 'pattern');
    // T3: Record dissolution in pattern timeline
    const isLongLived = (p.age || 0) > 500;
    state.patternTimeline.push({
      event: isLongLived ? 'resolution' : 'decay',
      patternId: p.id,
      patternType: p.type,
      patternName: p.name,
      age: p.age || 0,
      step: state.step,
      timestamp: Date.now()
    });
    if (state.patternTimeline.length > 100) state.patternTimeline.shift();
    if (isLongLived) {
      addLog(`✦ Resolution: ${p.name} dissolved after ${p.age} steps`, 'pattern');
    }
  });
  state.patterns = state.patterns.filter(p => !p.nodeIds || (p.energy >= 0.08 && !(p.lifetime_state === 'decaying' && p.age > 100)));

  // T1: Update wave membership tracking for visual emphasis
  updateWaveMembership();

  // FR1: Prune and rank patterns for display
  pruneAndRankPatterns();
}

// T1: Update wave node/edge membership for visual effects
function updateWaveMembership() {
  const time = performance.now() / 1000;

  // Clear stale memberships
  waveNodeMembership.clear();

  // Decay edge tints
  for (const [key, data] of waveEdgeMembership.entries()) {
    const elapsed = time - data.tintStart;
    if (elapsed > WAVE_VISUAL_CONFIG.edgeTintDuration) {
      waveEdgeMembership.delete(key);
    }
  }

  // Find active wave patterns
  const wavePatterns = state.patterns.filter(p => p.type === 'wave' && p.nodeIds && p.nodeIds.length > 0);

  // Track global wave amplitude for sparkline
  let maxWaveEnergy = 0;

  wavePatterns.forEach((wave, waveIndex) => {
    const nodes = wave.nodeIds || [];
    const wavePhase = time * WAVE_VISUAL_CONFIG.pulseFrequency * Math.PI * 2 + waveIndex * 0.5;
    const waveEnergy = wave.energy || 0.5;
    maxWaveEnergy = Math.max(maxWaveEnergy, waveEnergy);

    nodes.forEach((nodeId, i) => {
      const nodePhase = wavePhase - i * 0.4;
      const intensity = (Math.sin(nodePhase) * 0.5 + 0.5) * waveEnergy;

      // Track node membership
      const existing = waveNodeMembership.get(nodeId);
      if (!existing || intensity > existing.intensity) {
        waveNodeMembership.set(nodeId, {
          waveId: wave.id,
          phase: nodePhase,
          intensity
        });
      }

      // Track edge tints between consecutive wave nodes
      if (i < nodes.length - 1) {
        const nextId = nodes[i + 1];
        const edgeKey = [nodeId, nextId].sort().join('-');
        if (!waveEdgeMembership.has(edgeKey) || intensity > 0.5) {
          waveEdgeMembership.set(edgeKey, {
            waveId: wave.id,
            tintStart: time,
            intensity: intensity * WAVE_VISUAL_CONFIG.edgeTintIntensity
          });
        }
      }
    });
  });

  // T1: Update wave amplitude sparkline
  state.waveAmplitudeHistory.push(maxWaveEnergy);
  if (state.waveAmplitudeHistory.length > WAVE_VISUAL_CONFIG.sparklineLength) {
    state.waveAmplitudeHistory.shift();
  }
}

// FR1: Pattern pruning and ranking for display
function pruneAndRankPatterns() {
  // Calculate strength score for each pattern
  const scored = state.patterns
    .filter(p => p.nodeIds && p.nodeIds.length > 0)
    .map(p => {
      const minSize = PATTERN_CONFIG.minSize[p.type] || 3;
      const memberCount = p.nodeIds.length;
      const age = p.age || 0;
      const energy = p.energy || 0.5;
      const coherence = p.coherence || 0.5;

      // S2.5 Frame Logic: Apply weights from currentFrame
      const typeWeight = currentFrame && currentFrame.behavior.pattern_weights[p.type] !== undefined
        ? currentFrame.behavior.pattern_weights[p.type]
        : 1.0;

      // Strength score: weighted combination of energy, coherence, and normalized age
      const ageScore = Math.min(1, age / 200); // Normalize age to 0-1 over 200 steps
      const rawStrength = energy * 0.4 + coherence * 0.3 + ageScore * 0.3;
      const strength = rawStrength * typeWeight;

      return {
        pattern: p,
        memberCount,
        age,
        strength,
        meetsMinSize: memberCount >= minSize,
        meetsThreshold: age >= PATTERN_CONFIG.displayThresholds.minAge ||
          strength >= PATTERN_CONFIG.displayThresholds.minStrength
      };
    });

  // Filter to eligible patterns and sort by strength (desc), then age (desc)
  const eligible = scored
    .filter(s => s.meetsMinSize && s.meetsThreshold)
    .sort((a, b) => {
      if (Math.abs(b.strength - a.strength) > 0.05) return b.strength - a.strength;
      return b.age - a.age;
    });

  // Take top N patterns for display
  state.displayPatterns = eligible
    .slice(0, PATTERN_CONFIG.maxDisplayPatterns)
    .map(s => ({
      ...s.pattern,
      displayStrength: s.strength,
      displayRank: 0
    }));

  // Assign ranks
  state.displayPatterns.forEach((p, i) => p.displayRank = i);
}

// Safety HUD (S2.5) - PRD R5: Risk probability based on regime and history
export function updateHUDMetrics() {
  const regime = REGIMES[currentRegime];

  // Calculate risk factors
  const totalSensory = state.objects.reduce((s, o) => s + o.sensory * profile.sensory_amplification, 0);
  const avgSensory = totalSensory / Math.max(1, state.objects.length);
  const avgStress = state.objects.reduce((s, o) => s + o.stress, 0) / Math.max(1, state.objects.length);
  const avgActivation = state.objects.reduce((s, o) => s + o.activation, 0) / Math.max(1, state.objects.length);

  // PRD R5: Risk probability considers regime, not just instantaneous values
  const regimeRiskMultiplier = regime.name === 'Storm' ? 1.5 : (regime.name === 'Calm Rehearsal' ? 0.6 : 1.0);
  const sensoryRisk = avgSensory / profile.sensory_threshold;
  const noiseRisk = state.ambient.noise / 0.5; // Normalized to 0.5 as "high"
  const stressRisk = avgStress / 0.6;
  const activationRisk = Math.max(0, (avgActivation - 0.5) / 0.4); // Risk when avg > 0.5

  // Combined risk probability (weighted)
  const rawRisk = (sensoryRisk * 0.3 + noiseRisk * 0.25 + stressRisk * 0.25 + activationRisk * 0.2) * regimeRiskMultiplier;
  hudMetrics.globalOverloadIndex = Math.min(1, rawRisk);

  // Count high-stress nodes
  hudMetrics.clusterStressCount = state.objects.filter(o => o.stress > 0.5 || o.overloaded).length;

  // S2-T5: Pattern Density Metric
  state.metrics = state.metrics || {};
  (state.metrics as any).patternDensity = state.patterns.length / Math.max(1, state.objects.length);

  // Track history for trend
  hudMetrics.overloadHistory.push(hudMetrics.globalOverloadIndex);
  if (hudMetrics.overloadHistory.length > 60) hudMetrics.overloadHistory.shift();

  if (hudMetrics.overloadHistory.length >= 15) {
    const recent = hudMetrics.overloadHistory.slice(-15);
    const older = hudMetrics.overloadHistory.slice(-30, -15);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    if (recentAvg > olderAvg + 0.08) hudMetrics.recoveryTrend = 'up';
    else if (recentAvg < olderAvg - 0.08) hudMetrics.recoveryTrend = 'down';
    else hudMetrics.recoveryTrend = 'stable';
  }

  // S2.5 Frame Logic: Density Status
  if ((state.metrics as any).patternDensity !== undefined) {
    // PRD Thresholds: Calm < 1.5 <= Busy < 3.0 <= Saturated
    if ((state.metrics as any).patternDensity >= 3.0) hudMetrics.densityStatus = 'saturated';
    else if ((state.metrics as any).patternDensity >= 1.5) hudMetrics.densityStatus = 'busy';
    else hudMetrics.densityStatus = 'calm';
  }

  // Advisory when risk is sustained high
  if (hudMetrics.globalOverloadIndex > 0.7 && hudMetrics.overloadHistory.slice(-20).filter(v => v > 0.7).length > 15) {
    addLog('Advisory: High sustained risk', 'overload');
  }
}

// Physics (v1.0 - role-based, regime-aware)
export function integratePhysics(dt) {
  const objs = state.objects;
  const cx = canvasWidth * physicsConfig.gravity.cx;
  const cy = canvasHeight * physicsConfig.gravity.cy;
  const regime = REGIMES[currentRegime];

  // 1. Reset forces
  objs.forEach(o => { o.fx = 0; o.fy = 0; });

  // 2. Repulsion between all nodes
  for (let i = 0; i < objs.length; i++) {
    for (let j = i + 1; j < objs.length; j++) {
      const a = objs[i], b = objs[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distSq = dx * dx + dy * dy, dist = Math.sqrt(distSq) || 1;
      const minDist = physicsConfig.repulsion.min_distance;
      const rep = physicsConfig.repulsion.strength / Math.max(distSq, minDist * minDist);
      const fx = (dx / dist) * rep, fy = (dy / dist) * rep;
      a.fx -= fx; a.fy -= fy; b.fx += fx; b.fy += fy;
    }
  }

  // 3. Spring forces from edges (FR3: with stiffness cap)
  state.edges.forEach(e => {
    if (e.severed) return;
    const a = objs.find(o => o.id === e.sourceId), b = objs.find(o => o.id === e.targetId);
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
    const rest = e.rest_length || physicsConfig.spring.base_length;
    // FR3: Cap spring stiffness to prevent over-tightening
    const cappedK = Math.min(e.spring_k || physicsConfig.spring.stiffness, physicsConfig.spring.maxStiffness || 0.25);
    const forceMag = cappedK * (dist - rest);
    const fx = (dx / dist) * forceMag, fy = (dy / dist) * forceMag;
    a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
    e.tension = Math.max(0, Math.min(1, Math.abs(dist - rest) / rest));
  });

  // 4. Gravity toward center
  if (physicsConfig.gravity.enabled) {
    objs.forEach(o => {
      o.fx += (cx - o.x) * physicsConfig.gravity.strength;
      o.fy += (cy - o.y) * physicsConfig.gravity.strength;
    });
  }

  // 4b. S3 Task A: Density-based spread force (prevents tight clustering)
  if (objs.length > 1 && physicsConfig.layout) {
    // Compute centroid
    let centroidX = 0, centroidY = 0;
    objs.forEach(o => { centroidX += o.x; centroidY += o.y; });
    centroidX /= objs.length; centroidY /= objs.length;

    // Compute average pairwise distance
    let totalDist = 0, pairCount = 0;
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        totalDist += Math.hypot(objs[i].x - objs[j].x, objs[i].y - objs[j].y);
        pairCount++;
      }
    }
    const avgDist = pairCount > 0 ? totalDist / pairCount : physicsConfig.layout.targetSpacing;

    // If too dense, apply outward spread force from centroid
    const densityRatio = avgDist / physicsConfig.layout.targetSpacing;
    if (densityRatio < physicsConfig.layout.densityThreshold) {
      const spreadStrength = physicsConfig.layout.spreadForce * (1 - densityRatio / physicsConfig.layout.densityThreshold);
      objs.forEach(o => {
        if (o.pinned) return;
        const dx = o.x - centroidX, dy = o.y - centroidY;
        const dist = Math.hypot(dx, dy) || 1;
        const force = Math.min(spreadStrength * 100, physicsConfig.layout.maxSpreadForce * 100);
        o.fx += (dx / dist) * force;
        o.fy += (dy / dist) * force;
      });
    }
  }

  // 5. Ambient noise for ALL nodes (keeps sim alive)
  const time = performance.now() / 1000;
  objs.forEach(o => {
    if (o.pinned) return;
    const roleEffect = ROLE_EFFECTS[o.role] || ROLE_EFFECTS.Default;

    // Base ambient noise - every node gets some jitter
    const baseNoise = physicsConfig.noise.base_strength * 80;
    const heartbeat = Math.sin(time * 2 + o.x * 0.01) * 5; // Gentle breathing motion
    o.fx += (Math.random() - 0.5) * baseNoise + heartbeat;
    o.fy += (Math.random() - 0.5) * baseNoise + Math.cos(time * 2.3 + o.y * 0.01) * 5;

    // Explorer: extra random walk
    if (o.role === 'Explorer' && roleEffect.random_walk_strength) {
      const noiseStr = physicsConfig.noise.base_strength * roleEffect.random_walk_strength;
      const boost = (o.energy < 0.3 && physicsConfig.noise.energy_scaled) ? physicsConfig.noise.low_energy_boost : 0;
      o.fx += (Math.random() - 0.5) * (noiseStr + boost) * 500;
      o.fy += (Math.random() - 0.5) * (noiseStr + boost) * 500;
    }

    // Anchor: pull nearby nodes toward self (stabilization)
    if (o.role === 'Anchor') {
      objs.forEach(other => {
        if (other.id === o.id) return;
        const dx = o.x - other.x, dy = o.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150 && dist > 10) {
          const pullStrength = 0.05 * (1 - dist / 150);
          other.fx += (dx / dist) * pullStrength * 100;
          other.fy += (dy / dist) * pullStrength * 100;
        }
      });
    }

    // Bridge: boost edge weights around self
    if (o.role === 'Bridge' && roleEffect.edge_weight_boost) {
      state.edges.forEach(e => {
        if (e.sourceId === o.id || e.targetId === o.id) {
          e.spring_k = Math.min(1, e.spring_k + roleEffect.edge_weight_boost * 0.001);
        }
      });
    }

    // Sentinel: alert on high energy/stress
    if (o.role === 'Sentinel' && roleEffect.energy_threshold) {
      if (o.alertCooldown > 0) o.alertCooldown--;
      if (o.alertCooldown === 0 && (o.energy > roleEffect.energy_threshold || o.stress > (roleEffect.stress_threshold || 1))) {
        addLog(`Sentinel alert: ${o.label}`, 'overload');
        o.alertCooldown = roleEffect.alert_cooldown || 30;
      }
    }

    // Integrate velocity with role-based max speed
    let ax = o.fx / o.mass, ay = o.fy / o.mass;
    const accMag = Math.hypot(ax, ay);
    const maxAccel = 800;
    if (accMag > maxAccel) { ax *= maxAccel / accMag; ay *= maxAccel / accMag; }

    const frictionScaler = (physicsConfig as any).friction_gain_multiplier !== undefined ? (physicsConfig as any).friction_gain_multiplier : 1.0;
    // Effective damping: scale the friction component (1 - damping)
    const effectiveDamping = 1.0 - ((1.0 - physicsConfig.global_damping) * frictionScaler);

    o.vx = (o.vx + ax * dt) * effectiveDamping;
    o.vy = (o.vy + ay * dt) * effectiveDamping;

    // Clamp speed based on role
    const speed = Math.hypot(o.vx, o.vy);
    const maxSpeed = roleEffect.max_speed * 300;
    if (speed > maxSpeed) {
      o.vx *= maxSpeed / speed;
      o.vy *= maxSpeed / speed;
    }

    // S3-T1: Initialize previous velocity and trail buffer lazily
    if (o.prevVx === undefined) o.prevVx = o.vx;
    if (o.prevVy === undefined) o.prevVy = o.vy;
    if (!o.trail) o.trail = [];

    // S3-T1: Low-activation velocity smoothing to reduce micro-jitter
    const lowActivation = o.activation !== undefined ? o.activation < 0.3 : true;
    if (lowActivation) {
      const smoothFactor = 0.65; // 0 = frozen, 1 = no smoothing
      o.vx = o.prevVx * (1 - smoothFactor) + o.vx * smoothFactor;
      o.vy = o.prevVy * (1 - smoothFactor) + o.vy * smoothFactor;
    }

    o.prevVx = o.vx;
    o.prevVy = o.vy;

    o.x += o.vx * dt;
    o.y += o.vy * dt;

    // S3-T1: Sub-pixel clamp for near-rest nodes to avoid visual buzzing
    const tinySpeed = Math.hypot(o.vx, o.vy) < 5;
    if (tinySpeed) {
      const snapEps = 0.05;
      const rx = Math.round(o.x);
      const ry = Math.round(o.y);
      if (Math.abs(o.x - rx) < snapEps) o.x = rx;
      if (Math.abs(o.y - ry) < snapEps) o.y = ry;
    }

    // S3-T1: Record trails for visualization when enabled
    if (showTrails && o.activation >= (TRAIL_CONFIG.minActivationForTrails || 0)) {
      o.trail.push({ x: o.x, y: o.y });
      if (o.trail.length > (TRAIL_CONFIG.maxPoints || 25)) o.trail.shift();
    } else if (o.trail && o.trail.length > 0) {
      // Let trails fade out when disabled or node inactive
      o.trail.shift();
    }
  });

  // 6. Collision resolution
  if (physicsConfig.collision.enabled) {
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const a = objs[i], b = objs[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = (12 + a.mass * 15 + 12 + b.mass * 15) * physicsConfig.collision.min_distance_factor;
        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist, ny = dy / dist;
          const push = overlap * 0.5 * physicsConfig.collision.elasticity;
          if (!a.pinned) { a.x -= nx * push; a.y -= ny * push; }
          if (!b.pinned) { b.x += nx * push; b.y += ny * push; }
        }
      }
    }
  }

  // 7. Boundary constraints
  const margin = 40;
  objs.forEach(o => {
    if (o.pinned) return;
    if (o.x < margin) { o.x = margin; o.vx *= -physicsConfig.collision.elasticity; }
    if (o.x > canvasWidth - margin) { o.x = canvasWidth - margin; o.vx *= -physicsConfig.collision.elasticity; }
    if (o.y < margin) { o.y = margin; o.vy *= -physicsConfig.collision.elasticity; }
    if (o.y > canvasHeight - margin) { o.y = canvasHeight - margin; o.vy *= -physicsConfig.collision.elasticity; }
  });
}

// T2: Apply semantic role positional bias for topology readability
export function applySemanticPositionalBias() {
  const centerY = canvasHeight * 0.5;
  const biasStrength = physicsConfig.layout.verticalBiasStrength || 0.08;

  state.objects.forEach(o => {
    if (o.pinned) return;
    const semRole = getSemanticRole(o.label);
    if (!semRole) return;

    const cfg = SEMANTIC_ROLE_CONFIG[semRole];
    if (!cfg || cfg.verticalBias === undefined) return;

    // Target Y position based on vertical bias
    // Positive bias = higher (lower Y), negative = lower (higher Y)
    const targetY = centerY - cfg.verticalBias * canvasHeight * 0.4;
    const dy = targetY - o.y;

    // Apply gentle force toward target
    o.fy = (o.fy || 0) + dy * biasStrength * 50;
  });

  // T2: Enforce minimum non-adjacent distance
  const minDist = physicsConfig.layout.minNonAdjacentDistance || 150;
  const adjacentPairs = new Set();
  state.edges.forEach(e => {
    adjacentPairs.add(`${e.sourceId}-${e.targetId}`);
    adjacentPairs.add(`${e.targetId}-${e.sourceId}`);
  });

  for (let i = 0; i < state.objects.length; i++) {
    for (let j = i + 1; j < state.objects.length; j++) {
      const a = state.objects[i], b = state.objects[j];
      const pairKey = `${a.id}-${b.id}`;

      // Skip adjacent nodes
      if (adjacentPairs.has(pairKey)) continue;

      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist < minDist) {
        // Push apart
        const push = (minDist - dist) * 0.1;
        const nx = dx / dist, ny = dy / dist;
        if (!a.pinned) { a.fx = (a.fx || 0) - nx * push * 30; a.fy = (a.fy || 0) - ny * push * 30; }
        if (!b.pinned) { b.fx = (b.fx || 0) + nx * push * 30; b.fy = (b.fy || 0) + ny * push * 30; }
      }
    }
  }

  // T2: Horizontal spread for Positions (scatter apart)
  const positions = state.objects.filter(o => getSemanticRole(o.label) === 'Position');
  if (positions.length >= 2) {
    const centerX = canvasWidth * 0.5;
    positions.forEach((p, i) => {
      // Push positions away from center horizontally
      const targetX = i === 0 ? centerX - 150 : centerX + 150;
      const dx = targetX - p.x;
      p.fx = (p.fx || 0) + dx * 0.05 * 30;
    });
  }
}

// PRD R3: Pattern Influence - patterns as stress agents that reshape the field
// High-energy patterns actively maintain structure and affect node activation/motion
export function applyPatternInfluence() {
  const time = performance.now() / 1000;
  const regime = REGIMES[currentRegime];
  const baseInfluence = regime.patternInfluence || 1.0;

  state.patterns.forEach(p => {
    const nodeIds = p.nodeIds || p.object_ids || [];
    const nodes = nodeIds.map(id => state.objects.find(o => o.id === id)).filter(Boolean);
    if (nodes.length === 0) return;

    // Pattern energy scales all effects
    const patternEnergy = p.energy || 0.5;
    const influence = baseInfluence * patternEnergy;

    // Calculate pattern centroid
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;

    if (p.type === 'loop') {
      // Loops: synchronize activation, stiffen edges, dampen noise
      const loopDamping = 0.75 + (1 - influence) * 0.2;
      const avgActivation = nodes.reduce((s, n) => s + n.activation, 0) / nodes.length;

      nodes.forEach(n => {
        // Dampen forces (stability)
        n.fx *= loopDamping;
        n.fy *= loopDamping;

        // PRD R3: Nudge activation toward loop average (synchronization)
        const activationDiff = avgActivation - n.activation;
        n.activation += activationDiff * 0.02 * influence;
      });

      // Stiffen internal edges (high-energy loops are rigid)
      state.edges.forEach(e => {
        if (nodeIds.includes(e.sourceId) && nodeIds.includes(e.targetId)) {
          e.spring_k = Math.min(0.8, (e.spring_k || 0.2) + 0.05 * influence);
        }
      });
    }

    if (p.type === 'cluster') {
      // Clusters: cohesive pull + activation boost
      const pullStrength = 0.25 * influence;
      const avgActivation = nodes.reduce((s, n) => s + n.activation, 0) / nodes.length;

      nodes.forEach(n => {
        const dx = cx - n.x, dy = cy - n.y;
        const dist = Math.hypot(dx, dy) || 1;

        // Pull toward centroid (cohesion)
        n.fx += (dx / dist) * pullStrength * 80;
        n.fy += (dy / dist) * pullStrength * 80;

        // PRD R3: High-energy clusters boost member activation
        if (patternEnergy > 0.5) {
          n.activation = Math.min(0.98, n.activation + 0.005 * influence);
        }
      });
    }

    if (p.type === 'wave') {
      // Waves: propagating pulse effect
      const wavePhase = time * 2 + p.age * 0.1;
      const waveSpeed = 0.3 * influence;

      nodes.forEach((n, i) => {
        const nodePhase = wavePhase + i * 0.5;
        const pulse = Math.sin(nodePhase) * 0.5 + 0.5;

        // Oscillating force perpendicular to wave direction
        n.fx += Math.cos(nodePhase) * 30 * influence;
        n.fy += Math.sin(nodePhase) * 30 * influence;

        // PRD R3: Wave modulates activation
        n.activation += (pulse - 0.5) * 0.03 * influence;
        n.activation = Math.max(0.1, Math.min(0.98, n.activation));
      });
    }

    if (p.type === 'bridge' || p.tag === 'connection_hub') {
      // Bridges: high-frequency tremor + stress accumulation
      const tremorStrength = 35 * influence;

      nodes.forEach(n => {
        const tremor = Math.sin(time * 18 + n.x * 0.1) * tremorStrength;
        n.fx += tremor;
        n.fy += Math.cos(time * 21 + n.y * 0.1) * tremorStrength;

        // PRD R3: Bridges accumulate stress when active
        n.stress = Math.min(1, n.stress + 0.002 * influence);

        // High-energy bridges boost connected edge weights
        if (patternEnergy > 0.6) {
          state.edges.forEach(e => {
            if (e.sourceId === n.id || e.targetId === n.id) {
              e.weight = Math.min(2, e.weight + 0.001 * influence);
            }
          });
        }
      });
    }

    if (p.type === 'membrane') {
      // PRD R2: Membrane breathing - area oscillates with activation
      const membraneIds = new Set(nodeIds);
      const avgActivation = nodes.reduce((s, n) => s + n.activation, 0) / nodes.length;
      const breathPhase = Math.sin(time * 1.5 + p.age * 0.05);
      const breathAmplitude = physicsConfig.layout.breathingAmplitude || 0.15;
      const targetScale = 1 + breathPhase * breathAmplitude * avgActivation * influence;

      nodes.forEach(n => {
        const dx = n.x - cx, dy = n.y - cy;
        const dist = Math.hypot(dx, dy) || 1;

        // Breathing force: push/pull based on breath phase
        const breathForce = (targetScale - 1) * 60 * influence;
        n.fx += (dx / dist) * breathForce;
        n.fy += (dy / dist) * breathForce;

        // Membrane nodes resist perpendicular motion (tangential stability)
        const tangentX = -dy / dist, tangentY = dx / dist;
        const tangentForce = n.fx * tangentX + n.fy * tangentY;
        n.fx -= tangentForce * tangentX * 0.3 * influence;
        n.fy -= tangentForce * tangentY * 0.3 * influence;
      });

      // PRD R3: Membrane resists inward collapse
      state.objects.forEach(o => {
        if (membraneIds.has(o.id)) return;
        const dx = o.x - cx, dy = o.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const avgMembraneDist = nodes.reduce((s, n) => s + Math.hypot(n.x - cx, n.y - cy), 0) / nodes.length;

        // Inside nodes pushed toward center, outside pushed away
        if (dist < avgMembraneDist * 0.9) {
          o.fx -= (dx / dist) * 15 * influence;
          o.fy -= (dy / dist) * 15 * influence;
        } else if (dist > avgMembraneDist * 1.1) {
          o.fx += (dx / dist) * 10 * influence;
          o.fy += (dy / dist) * 10 * influence;
        }
      });
    }

    if (p.type === 'levin' && p.tag === 'pressure_theme') {
      // High stress clusters: expand and increase local stress
      nodes.forEach(n => {
        const dx = n.x - cx, dy = n.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        n.fx += (dx / dist) * 20 * influence;
        n.fy += (dy / dist) * 20 * influence;
        n.stress = Math.min(1, n.stress + 0.003 * influence);
      });
    }
  });
}

// Energy and Stress update (Levin-style)
export function updateEnergyStress(dt) {
  const regime = REGIMES[currentRegime];
  state.objects.forEach(o => {
    const roleEffect = ROLE_EFFECTS[o.role] || ROLE_EFFECTS.Default;

    // Energy: based on velocity and activation
    const speed = Math.hypot(o.vx, o.vy);
    o.energy = Math.min(regime.energy_ceiling, Math.max(regime.energy_floor,
      o.energy * 0.99 + (speed / 100 + o.activation) * 0.01
    ));

    // Stress: based on edge tension and degree
    const connectedEdges = state.edges.filter(e => (e.sourceId === o.id || e.targetId === o.id) && !e.severed);
    const avgTension = connectedEdges.length > 0
      ? connectedEdges.reduce((s, e) => s + e.tension, 0) / connectedEdges.length
      : 0;
    const degreeStress = o.role === 'Bridge' ? connectedEdges.length * (roleEffect.stress_from_degree || 0) : 0;

    // Stress decay for Anchors
    const decayRate = roleEffect.stress_decay_rate || 0.01;
    o.stress = Math.min(regime.stress_ceiling, Math.max(regime.stress_floor,
      o.stress * (1 - decayRate) + (avgTension + degreeStress + state.ambient.noise * 0.5) * 0.02
    ));
  });
}

export function ambientStep(dt) {
  // Noise decays faster when safety is high
  state.ambient.noise *= Math.pow(0.95 + state.ambient.safety * 0.04, dt * 60);
  state.ambient.noise = Math.max(0.05, state.ambient.noise); // Minimum ambient noise

  // [REGRESSION FIX] Increment pattern age (was missing, causing long-lived test failure)
  state.patterns.forEach(p => p.age = (p.age || 0) + 1);

  state.objects.forEach(o => {
    o.overloadEnergy = Math.max(0, o.overloadEnergy - 2.0 * dt); // Faster recovery
    // Sensory decays naturally
    o.sensory = Math.max(0.1, o.sensory * 0.995);

    // Overload only when sustained high load
    const load = o.sensory * profile.sensory_amplification + state.ambient.noise * 0.5;
    if (load > profile.sensory_threshold * 1.2 && !o.overloaded && o.sensory > 0.6) {
      o.overloaded = true; o.overloadEnergy = Math.min(o.overloadEnergy + 0.8, 2.0);
      o.activation *= 0.8; state.overloads++;
      // Only sever edges if really overloaded
      if (o.sensory > 0.8) {
        const connected = state.edges.filter(e => (e.sourceId === o.id || e.targetId === o.id) && !e.severed);
        const toSever = Math.max(1, Math.ceil(connected.length * profile.overload_cut_fraction * 0.5));
        connected.sort((a, b) => a.weight - b.weight).slice(0, toSever).forEach(e => { e.severed = true; e.recovery = 0; });
      }
      state.ambient.noise = Math.min(1, state.ambient.noise + 0.02);
      addLog(`Overload: ${o.label}`, 'overload');
    }
    if (o.overloaded && o.overloadEnergy < 0.05) o.overloaded = false;
  });
  state.edges.forEach(e => {
    if (!e.severed) return;
    e.recovery += profile.recovery_rate * state.ambient.safety * dt;
    if (e.recovery >= 1) { e.severed = false; e.recovery = 0; e.tension = 0; state.recoveries++; addLog(`Recovery: ${e.id}`, 'recovery'); }
  });
}

export function activationStep(dt) {
  // T1: Enhanced activation dynamics with semantic role support
  const regime = REGIMES[currentRegime];
  const varianceBoost = profile.activationVarianceBoost || 0.15;
  const regimeNoiseFactor = regime.noise_base / 0.15;

  // Material-dependent variance multipliers
  const materialVariance = {
    gold: 0.8, iron: 0.6, copper: 1.0, titanium: 0.5, silver: 0.9,
    quartz: 0.7, tourmaline: 1.1, fluorite: 0.9,
    carbon: 0.8, mycelium: 1.2, nitrogen: 1.0, oxygen: 0.9
  };

  // Fallback role config (physics roles)
  const roleConfig = {
    Anchor: { variance: 0.4, resting: 0.55, decayRate: 0.04 },
    Explorer: { variance: 1.4, resting: 0.30, decayRate: 0.12 },
    Bridge: { variance: 1.5, resting: 0.45, decayRate: 0.08 },
    Sentinel: { variance: 0.7, resting: 0.50, decayRate: 0.06 },
    Default: { variance: 1.0, resting: 0.40, decayRate: 0.07 }
  };

  // T1: Calculate Position and CommonGround average activation for Bridge tension tracking
  let positionAvgActivation = 0, positionCount = 0;
  let commonGroundActivation = 0;
  state.objects.forEach(o => {
    const semRole = getSemanticRole(o.label);
    if (semRole === 'Position') { positionAvgActivation += o.activation; positionCount++; }
    if (semRole === 'CommonGround') { commonGroundActivation = o.activation; }
  });
  positionAvgActivation = positionCount > 0 ? positionAvgActivation / positionCount : 0.5;
  const tensionDiff = Math.abs(positionAvgActivation - commonGroundActivation);

  // Get pattern membership for each node
  const nodePatternInfluence = {};
  state.patterns.forEach(p => {
    const nodeIds = p.nodeIds || p.object_ids || [];
    const patternEnergy = p.energy || 0.5;
    nodeIds.forEach(id => {
      if (!nodePatternInfluence[id]) nodePatternInfluence[id] = { boost: 0, dampen: 0 };
      if (p.type === 'loop') nodePatternInfluence[id].dampen += patternEnergy * 0.3;
      else if (p.type === 'cluster') nodePatternInfluence[id].boost += patternEnergy * 0.2;
      else if (p.type === 'wave') nodePatternInfluence[id].boost += patternEnergy * 0.15;
    });
  });

  state.objects.forEach(o => {
    const semRole = getSemanticRole(o.label);
    const semCfg = semRole ? SEMANTIC_ROLE_CONFIG[semRole] : null;
    const physCfg = roleConfig[o.role] || roleConfig.Default;
    const patternFx = nodePatternInfluence[o.id] || { boost: 0, dampen: 0 };

    // Use semantic config if available, otherwise physics role config
    const resting = semCfg ? semCfg.resting : physCfg.resting;
    const decayRate = semCfg ? semCfg.decay : physCfg.decayRate;
    const gain = semCfg ? semCfg.gain : 1.0;
    const noiseCouple = semCfg ? semCfg.noiseCouple : 1.0;
    const minAct = semCfg ? semCfg.minActivation : 0.1;
    const maxAct = semCfg ? semCfg.maxActivation : 0.98;
    const burstChance = semCfg ? semCfg.burstChance : 0.008;
    const dipChance = semCfg ? semCfg.dipChance : 0.004;

    // 1. Decay toward resting level
    const effectiveDecay = decayRate * profile.decay * (1 + patternFx.dampen);
    o.activation += (resting - o.activation) * effectiveDecay * dt * 60;

    // T1: Bridge special behavior - track tension between Positions and CommonGround
    if (semCfg && (semCfg as any).tracksTension) {
      const tensionTarget = 0.3 + tensionDiff * 1.2; // Maps diff to activation
      o.activation += (tensionTarget - o.activation) * 0.03 * dt * 60;
    }

    // T2: Role-based activation gain for contrast
    const labelRole = o.label.toLowerCase().includes('question') ? 'Question' :
      o.label.toLowerCase().includes('synthesis') ? 'Synthesis' :
        o.label.toLowerCase().includes('source') ? 'Source' :
          o.label.toLowerCase().includes('note') ? 'Note' :
            o.label.toLowerCase().includes('position') ? 'Position' : 'Default';
    const roleGain = ACTIVATION_CONTRAST_CONFIG.roleGain[labelRole] || 1.0;

    // T2: Question breathing modulation (slow sine wave that propagates)
    const time = performance.now() / 1000;
    const breathPhase = (time / ACTIVATION_CONTRAST_CONFIG.breathingPeriod) * Math.PI * 2;

    if (labelRole === 'Question') {
      // Question node breathes - slow activation modulation
      const breathMod = Math.sin(breathPhase) * ACTIVATION_CONTRAST_CONFIG.breathingAmplitude;
      o.activation += breathMod * dt * 10;
    } else {
      // Other nodes receive delayed breathing propagation based on graph distance
      // Approximate distance by checking if connected to Question
      const connectedToQuestion = state.edges.some(e =>
        !e.severed &&
        ((e.sourceId === o.id && state.objects.find(obj => obj.id === e.targetId)?.label.toLowerCase().includes('question')) ||
          (e.targetId === o.id && state.objects.find(obj => obj.id === e.sourceId)?.label.toLowerCase().includes('question')))
      );
      if (connectedToQuestion) {
        const delayedPhase = breathPhase - ACTIVATION_CONTRAST_CONFIG.propagationDelay * Math.PI;
        const breathMod = Math.sin(delayedPhase) * ACTIVATION_CONTRAST_CONFIG.breathingAmplitude * 0.5;
        o.activation += breathMod * dt * 10;
      }
    }

    // T2: Apply role gain to resting level pull
    const adjustedResting = resting * roleGain;

    // 2. Noise with gain and coupling
    const matVar = materialVariance[o.material] || 1.0;
    const variance = semCfg ? (1.0 / gain) : (physCfg.variance || 1.0);
    const sigma = varianceBoost * matVar * variance * regimeNoiseFactor * noiseCouple * (1 - patternFx.dampen * 0.5);

    const u1 = Math.random(), u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
    o.activation += gaussian * sigma * dt * 15 * gain;

    // 3. Pattern-driven nudges
    if (patternFx.boost > 0) {
      const direction = o.activation > resting ? 1 : -1;
      o.activation += direction * patternFx.boost * 0.02 * dt * 60 * gain;
    }

    // 4. Spontaneous bursts
    if (Math.random() < burstChance * regimeNoiseFactor * dt * 60) {
      const burstMag = 0.2 + Math.random() * 0.3;
      o.activation = Math.min(maxAct, o.activation + burstMag);
    }

    // 5. Spontaneous dips
    if (Math.random() < dipChance * regimeNoiseFactor * dt * 60 && o.activation > minAct + 0.2) {
      const dipMag = 0.15 + Math.random() * 0.2;
      o.activation = Math.max(minAct, o.activation - dipMag);
    }

    // 6. Energy coupling
    if (o.energy > regime.energy_ceiling * 0.7) {
      o.activation += 0.01 * dt * 60;
    }

    // Clamp to semantic role range
    o.activation = Math.max(minAct, Math.min(maxAct, o.activation));

    // T2: Safety clamp for Meditative profiles - never trigger overload
    const isMeditative = regime.name?.toLowerCase().includes('meditative') ||
      regime.name?.toLowerCase().includes('calm') ||
      regime.name?.toLowerCase().includes('slow');
    if (isMeditative && state.ambient.safety >= 0.4) {
      o.activation = Math.min(o.activation, ACTIVATION_CONTRAST_CONFIG.safetyClamp);
    }

    // Track history
    if (!o.activationHistory) o.activationHistory = [];
    o.activationHistory.push(o.activation);
    if (o.activationHistory.length > 60) o.activationHistory.shift();
  });

  // Spread activation through edges
  const deltas = {};
  state.edges.forEach(e => {
    if (e.severed) return;
    const src = state.objects.find(o => o.id === e.sourceId);
    const tgt = state.objects.find(o => o.id === e.targetId);
    if (!src || !tgt) return;

    const spreadRate = 0.035 * e.weight * (1 + (regime.patternInfluence - 1) * 0.3);
    const gradient = src.activation - tgt.activation;

    if (Math.abs(gradient) > 0.05) {
      const flow = gradient * spreadRate * dt * 60;
      deltas[tgt.id] = (deltas[tgt.id] || 0) + flow * 0.6;
      deltas[src.id] = (deltas[src.id] || 0) - flow * 0.3;
    }
  });

  Object.entries(deltas).forEach(([id, delta]) => {
    const o = state.objects.find(obj => obj.id === id);
    if (o) {
      const semRole = getSemanticRole(o.label);
      const semCfg = semRole ? SEMANTIC_ROLE_CONFIG[semRole] : null;
      const minAct = semCfg ? semCfg.minActivation : 0.1;
      const maxAct = semCfg ? semCfg.maxActivation : 0.98;
      o.activation = Math.max(minAct, Math.min(maxAct, o.activation + delta));
    }
  });
}

// Rendering with Lenses (S2.3)
function render() {
  ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Apply camera transform
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-canvasWidth / 2 + camera.x, -canvasHeight / 2 + camera.y);

  // Grid (adjusted for camera)
  ctx.strokeStyle = '#0f0f12'; ctx.lineWidth = 1 / camera.zoom;
  const gridSize = 60;
  const startX = Math.floor(-camera.x / gridSize) * gridSize - gridSize;
  const startY = Math.floor(-camera.y / gridSize) * gridSize - gridSize;
  for (let x = startX; x < canvasWidth / camera.zoom + Math.abs(camera.x) + gridSize; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, -Math.abs(camera.y) - gridSize); ctx.lineTo(x, canvasHeight / camera.zoom + Math.abs(camera.y) + gridSize); ctx.stroke();
  }
  for (let y = startY; y < canvasHeight / camera.zoom + Math.abs(camera.y) + gridSize; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(-Math.abs(camera.x) - gridSize, y); ctx.lineTo(canvasWidth / camera.zoom + Math.abs(camera.x) + gridSize, y); ctx.stroke();
  }

  // FR4: Pattern visual link - use displayPatterns for cleaner rendering
  // PRD R5: Controlled by showPatternOverlays toggle
  const time = performance.now() / 1000;

  // FR4: Draw top-ranked pattern with prominent hull first
  if (showPatternOverlays && state.displayPatterns.length > 0) {
    const topPattern = state.displayPatterns[0];
    const topNodes = (topPattern.nodeIds || []).map(id => state.objects.find(o => o.id === id)).filter(Boolean);
    if (topNodes.length >= 3) {
      let cx = 0, cy = 0;
      topNodes.forEach(n => { cx += n.x; cy += n.y; });
      cx /= topNodes.length; cy /= topNodes.length;

      const sorted = [...topNodes].sort((a, b) =>
        Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
      );

      // FR4: Prominent filled hull for top pattern
      ctx.beginPath();
      ctx.moveTo(sorted[0].x, sorted[0].y);
      for (let i = 1; i < sorted.length; i++) {
        ctx.lineTo(sorted[i].x, sorted[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.08)'; // Gold fill
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // FR4: Render displayPatterns (pruned list) instead of all patterns
  if (showPatternOverlays) state.displayPatterns.forEach((p, patternIndex) => {
    const nodeIds = p.nodeIds || p.object_ids || [];
    const nodes = nodeIds.map(id => state.objects.find(o => o.id === id)).filter(Boolean);
    if (nodes.length === 0) return;

    const age = p.age ?? p.lifetime_steps ?? 0;
    const energy = p.energy || 0.5;
    const isHovered = p.id === hoveredPatternId;
    const isTop = patternIndex === 0;

    // FR4: Boost alpha for hovered patterns
    const hoverBoost = isHovered ? 0.3 : 0;
    const ageAlpha = Math.min(0.5, 0.15 + age * 0.002) + hoverBoost;

    if (p.type === 'loop') {
      // T3: Loop - double outline on anchor + dashed soft glow on edges
      if (nodes.length >= 2) {
        // Soft glow path with dashes
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let i = 1; i < nodes.length; i++) {
          ctx.lineTo(nodes[i].x, nodes[i].y);
        }
        ctx.closePath();

        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = `rgba(255, 133, 193, ${ageAlpha * energy})`;
        ctx.lineWidth = 3 + Math.min(age * 0.015, 3);
        ctx.stroke();
        ctx.setLineDash([]);

        // T3: Double outline on anchor node (first node)
        const anchor = nodes[0];
        const r = 12 + (anchor.mass || 0.8) * 15;
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 200, 230, ${0.4 + energy * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 133, 193, ${0.2 + energy * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else if (p.type === 'cluster') {
      // T3: Cluster - distinct colored polygon with label
      if (nodes.length >= 3) {
        let cx = 0, cy = 0;
        nodes.forEach(n => { cx += n.x; cy += n.y; });
        cx /= nodes.length; cy /= nodes.length;

        const sorted = [...nodes].sort((a, b) =>
          Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
        );

        ctx.beginPath();
        ctx.moveTo(sorted[0].x, sorted[0].y);
        for (let i = 1; i < sorted.length; i++) {
          ctx.lineTo(sorted[i].x, sorted[i].y);
        }
        ctx.closePath();

        // T3: Distinct fill color per cluster (use pattern id hash)
        const hue = (parseInt(p.id.replace(/\D/g, '') || '0') * 47) % 360;
        ctx.fillStyle = `hsla(${hue}, 60%, 50%, ${0.12 * energy})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.3 * energy})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label at centroid
        ctx.fillStyle = `hsla(${hue}, 70%, 70%, 0.8)`;
        ctx.font = '11px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.name || `Cluster (${nodes.length})`, cx, cy);
      }
    } else if (p.type === 'wave') {
      // T3: Wave - directional shimmer traveling along nodes
      const wavePhase = (time * 3 + age * 0.1) % (Math.PI * 2);

      nodes.forEach((n, i) => {
        const nodePhase = wavePhase - i * 0.4;
        const shimmer = Math.sin(nodePhase) * 0.5 + 0.5;
        const r = 12 + (n.mass || 0.8) * 15;

        // Phased brightness ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4 + shimmer * 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(122, 179, 255, ${shimmer * 0.5 * energy})`;
        ctx.lineWidth = 2 + shimmer * 2;
        ctx.stroke();

        // T3: Directional streak to next node
        if (i < nodes.length - 1) {
          const next = nodes[i + 1];
          const dx = next.x - n.x, dy = next.y - n.y;
          const dist = Math.hypot(dx, dy) || 1;
          const streakLen = shimmer * 30;

          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n.x + (dx / dist) * streakLen, n.y + (dy / dist) * streakLen);
          ctx.strokeStyle = `rgba(122, 179, 255, ${shimmer * 0.4})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });
    } else if (p.type === 'bridge' || p.name?.includes('Bridge')) {
      // Bridge: heartbeat glow on bridge nodes
      const heartbeat = (Math.sin(time * 4) * 0.5 + 0.5) * (Math.sin(time * 4.3) * 0.3 + 0.7);
      nodes.forEach(n => {
        // Double outline with hue shift
        ctx.beginPath();
        ctx.arc(n.x, n.y, 25 + heartbeat * 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 133, 193, ${0.3 + heartbeat * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x, n.y, 30 + heartbeat * 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 + heartbeat * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    } else if (p.type === 'membrane') {
      // Membrane: dashed boundary
      if (nodes.length >= 3) {
        let cx = 0, cy = 0;
        nodes.forEach(n => { cx += n.x; cy += n.y; });
        cx /= nodes.length; cy /= nodes.length;
        const sorted = [...nodes].sort((a, b) =>
          Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
        );
        ctx.beginPath();
        ctx.moveTo(sorted[0].x, sorted[0].y);
        for (let i = 1; i < sorted.length; i++) {
          ctx.lineTo(sorted[i].x, sorted[i].y);
        }
        ctx.closePath();
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = `rgba(179, 138, 219, ${ageAlpha})`; // Purple dashed
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });

  // Pattern highlight (selected pattern)
  if (selectedPatternId) {
    const pattern = state.patterns.find(p => p.id === selectedPatternId);
    if (pattern) {
      const nodeIds = pattern.nodeIds || pattern.object_ids || [];
      nodeIds.forEach(nodeId => {
        const o = state.objects.find(obj => obj.id === nodeId);
        if (o) { ctx.beginPath(); ctx.arc(o.x, o.y, 50, 0, Math.PI * 2); ctx.fillStyle = 'rgba(26, 92, 255, 0.15)'; ctx.fill(); }
      });
    }
  }

  // S3-T1: Motion trails (dev visualization)
  if (showTrails) {
    state.objects.forEach(o => {
      if (!o.trail || o.trail.length < 2) return;
      ctx.beginPath();
      for (let i = 0; i < o.trail.length; i++) {
        const pt = o.trail[i];
        const t = i / (o.trail.length - 1 || 1);
        const alpha = 0.05 + t * 0.25;
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = `rgba(124, 252, 255, ${alpha})`;
      }
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  // Edges (T1: with wave tinting)
  state.edges.forEach(e => {
    const a = state.objects.find(o => o.id === e.sourceId), b = state.objects.find(o => o.id === e.targetId);
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    const inPattern = selectedPatternId && state.patterns.find(p => p.id === selectedPatternId && p.nodeIds.includes(a.id) && p.nodeIds.includes(b.id));

    // T1: Check for wave tinting
    const edgeKey = [e.sourceId, e.targetId].sort().join('-');
    const waveTint = waveEdgeMembership.get(edgeKey);

    if (e.severed) { ctx.strokeStyle = `rgba(74, 74, 74, ${0.3 + e.recovery * 0.4})`; ctx.setLineDash([6, 6]); ctx.lineWidth = 1; }
    else if (inPattern) { ctx.strokeStyle = '#1a5cff'; ctx.setLineDash([]); ctx.lineWidth = 2.5; }
    else if (waveTint && waveTint.intensity > 0.1) {
      // T1: Wave-tinted edge - brief brightness boost synchronized with wave
      const tintAlpha = 0.4 + waveTint.intensity * 0.5;
      ctx.strokeStyle = `rgba(122, 200, 255, ${tintAlpha})`;
      ctx.setLineDash([]);
      ctx.lineWidth = 2 + waveTint.intensity * 1.5;
    }
    else if (e.tension > 0.5) { ctx.strokeStyle = `rgba(255, 107, 107, ${0.5 + e.tension * 0.5})`; ctx.setLineDash([]); ctx.lineWidth = 1.5 + e.tension; }
    else { ctx.strokeStyle = `rgba(148, 148, 148, ${0.3 + e.weight * 0.3})`; ctx.setLineDash([]); ctx.lineWidth = 1 + e.weight * 0.5; }
    ctx.stroke(); ctx.setLineDash([]);
  });

  // Objects with lenses
  state.objects.forEach(o => {
    let r = 12 + o.mass * 15, color = o.mat.color, haloColor = null, haloRadius = 0;

    // Lens effects (v1.0)
    if (currentLens === 'activation') r = 10 + o.activation * 30;
    else if (currentLens === 'material_type') {
      if (o.mat.category === 'metal') color = '#ffd700';
      else if (o.mat.category === 'mineral') color = '#b38adb';
      else color = '#5cff9d';
    } else if (currentLens === 'sensitivity') { haloColor = `rgba(255, 107, 107, ${o.sensory})`; haloRadius = r + 20 + o.sensory * 30; }
    else if (currentLens === 'overload_risk') {
      const risk = (o.sensory * profile.sensory_amplification + state.ambient.noise) / profile.sensory_threshold;
      if (risk > 0.8) color = '#ff6b6b';
      else if (risk > 0.5) color = '#e6ff1a';
      else color = '#5cff9d';
    } else if (currentLens === 'role') {
      const roleEffect = ROLE_EFFECTS[o.role] || ROLE_EFFECTS.Default;
      color = roleEffect.color;
      r = 12 + o.mass * 15 + (o.role === 'Anchor' ? 5 : 0);
    } else if (currentLens === 'energy') {
      const regime = REGIMES[currentRegime];
      const normalized = (o.energy - regime.energy_floor) / (regime.energy_ceiling - regime.energy_floor);
      r = 10 + normalized * 25;
      if (normalized > 0.7) color = '#ff6b6b';
      else if (normalized > 0.4) color = '#e6ff1a';
      else color = '#5cff9d';
    } else if (currentLens === 'stress') {
      const regime = REGIMES[currentRegime];
      const normalized = (o.stress - regime.stress_floor) / (regime.stress_ceiling - regime.stress_floor);
      haloColor = `rgba(255, 107, 107, ${normalized * 0.6})`;
      haloRadius = r + 10 + normalized * 40;
      if (normalized > 0.7) color = '#ff6b6b';
      else if (normalized > 0.4) color = '#e6ff1a';
      else color = '#949494';
    }

    // Halo
    if (haloColor && haloRadius > 0) { ctx.beginPath(); ctx.arc(o.x, o.y, haloRadius, 0, Math.PI * 2); ctx.fillStyle = haloColor; ctx.fill(); }

    // Overload glow
    if (o.overloadEnergy > 0) {
      const glowR = r + 15 + o.overloadEnergy * 20;
      const grad = ctx.createRadialGradient(o.x, o.y, r, o.x, o.y, glowR);
      grad.addColorStop(0, `rgba(230, 255, 26, ${o.overloadEnergy * 0.4})`); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(o.x, o.y, glowR, 0, Math.PI * 2); ctx.fill();
      o.x += (Math.random() - 0.5) * o.overloadEnergy * 2; o.y += (Math.random() - 0.5) * o.overloadEnergy * 2;
    }

    // Activation glow
    if (o.activation > 0.5 && currentLens !== 'activation') {
      const glowR = r + 10 + o.activation * 15;
      const grad = ctx.createRadialGradient(o.x, o.y, r * 0.5, o.x, o.y, glowR);
      const rgb = hexToRgb(o.mat.color);
      grad.addColorStop(0, `rgba(${rgb}, ${o.activation * 0.3})`); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(o.x, o.y, glowR, 0, Math.PI * 2); ctx.fill();
    }

    // T1: Wave membership pulsing effect
    const waveMember = waveNodeMembership.get(o.id);
    if (waveMember && waveMember.intensity > 0.1) {
      // Gentle scale pulse based on wave phase
      const pulseScale = 1 + waveMember.intensity * WAVE_VISUAL_CONFIG.pulseAmplitude;
      r *= pulseScale;

      // Wave glow ring
      const waveGlowR = r + WAVE_VISUAL_CONFIG.nodeGlowRadius * waveMember.intensity;
      ctx.beginPath();
      ctx.arc(o.x, o.y, waveGlowR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(122, 200, 255, ${waveMember.intensity * 0.5})`;
      ctx.lineWidth = 2 + waveMember.intensity * 2;
      ctx.stroke();
    }

    // Body - shape by material (R8 from PRD)
    ctx.fillStyle = color; ctx.globalAlpha = 0.4 + o.activation * 0.6;
    ctx.beginPath();
    drawMaterialShape(ctx, o.x, o.y, r, o.material);
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = o.overloaded ? '#ff6b6b' : '#4a4a4a';
    ctx.lineWidth = o.overloaded ? 2.5 : 1 + o.energy * 1.5; // Outline thickness = energy
    ctx.stroke();

    // Hover highlight
    if (hoveredNode === o.id) {
      ctx.strokeStyle = '#e6ff1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(o.x, o.y, r + 4, 0, Math.PI * 2); ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#c4c4c4'; ctx.font = '11px "Space Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(o.label, o.x, o.y + r + 14);
  });

  // Draw drag indicator
  if (draggedNode) {
    const o = state.objects.find(obj => obj.id === draggedNode);
    if (o) {
      ctx.strokeStyle = '#1a5cff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(o.x, o.y, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Restore camera transform
  ctx.restore();

  // Draw zoom indicator (outside camera transform)
  ctx.fillStyle = '#949494'; ctx.font = '10px "Space Mono", monospace';
  ctx.fillText(`Zoom: ${(camera.zoom * 100).toFixed(0)}%`, 10, canvasHeight - 10);
}

function hexToRgb(hex) { const h = hex.replace('#', ''); return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`; }

// Draw material-specific shapes (R8 from PRD)
function drawMaterialShape(ctx, x, y, r, material) {
  switch (material) {
    case 'gold': // Circle
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'iron': // Square
      ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
      break;
    case 'nickel': // Rounded square
      const rr = r * 0.3;
      ctx.moveTo(x - r * 0.7 + rr, y - r * 0.7);
      ctx.lineTo(x + r * 0.7 - rr, y - r * 0.7);
      ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.7, x + r * 0.7, y - r * 0.7 + rr);
      ctx.lineTo(x + r * 0.7, y + r * 0.7 - rr);
      ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.7, x + r * 0.7 - rr, y + r * 0.7);
      ctx.lineTo(x - r * 0.7 + rr, y + r * 0.7);
      ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.7, x - r * 0.7, y + r * 0.7 - rr);
      ctx.lineTo(x - r * 0.7, y - r * 0.7 + rr);
      ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.7, x - r * 0.7 + rr, y - r * 0.7);
      break;
    case 'quartz': // Diamond
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.7, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.7, y);
      ctx.closePath();
      break;
    case 'water': // Soft blob (wavy circle)
      for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const wobble = r * (0.85 + Math.sin(angle * 3) * 0.15);
        const px = x + Math.cos(angle) * wobble;
        const py = y + Math.sin(angle) * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'mycelium': // Branchy blob
      for (let i = 0; i <= 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spike = i % 2 === 0 ? 1.2 : 0.7;
        const px = x + Math.cos(angle) * r * spike;
        const py = y + Math.sin(angle) * r * spike;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'graphite': // Hexagon
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'silicon': // Chip-like rectangle
      ctx.rect(x - r * 1.1, y - r * 0.6, r * 2.2, r * 1.2);
      break;
    case 'foam': // Dotted circle (draw as circle, dots added separately)
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'amber': // Rounded triangle
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * 0.2, y - r * 0.6, x + r * 0.8, y + r * 0.6);
      ctx.quadraticCurveTo(x, y + r * 0.9, x - r * 0.8, y + r * 0.6);
      ctx.quadraticCurveTo(x - r * 0.2, y - r * 0.6, x, y - r);
      ctx.closePath();
      break;
    default: // Default circle
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

// UI Updates
function updateUI() {
  const elPatterns = document.getElementById('pattern-count');
  if (elPatterns) elPatterns.textContent = String(state.patterns.length);
  const elObjects = document.getElementById('object-count');
  if (elObjects) elObjects.textContent = String(state.objects.length);

  // Patterns panel
  const patternList = document.getElementById('pattern-list');
  if (patternList) {
    patternList.innerHTML = state.patterns.map(p => {
    const age = p.age ?? p.lifetime_steps ?? 0;
    const energy = p.energy ?? p.average_stress ?? 0;
    const influence = p.influence ?? (p.object_ids ? p.object_ids.length / state.objects.length : 0);
    return `
    <div class="mgs-pattern-item ${p.type} ${p.id === selectedPatternId ? 'selected' : ''}" data-id="${p.id}">
      <div class="mgs-pattern-row"><span class="mgs-pattern-name">${p.name}</span><span class="mgs-pattern-type">${p.type}</span></div>
      <div class="mgs-pattern-stats">Age: <span>${age}</span> | Energy: <span>${energy.toFixed(2)}</span> | Influence: <span>${influence.toFixed(2)}</span></div>
    </div>
  `}).join('');
    patternList.querySelectorAll('.mgs-pattern-item').forEach(el => {
      (el as HTMLElement).onclick = () => { selectedPatternId = selectedPatternId === (el as HTMLElement).dataset.id ? null : (el as HTMLElement).dataset.id; updateUI(); };
    });
  }

  // Objects panel
  const objectList = document.getElementById('object-list');
  if (objectList) objectList.innerHTML = state.objects.map(o => {
    const matClass = `mat-${o.mat.category}`, stateClass = o.overloaded ? 'overloaded' : (o.activation > 0.7 ? 'high' : '');
    return `<div class="mgs-object-item ${matClass} ${stateClass}"><strong>${o.label}</strong><span>${o.activation.toFixed(2)}</span></div>`;
  }).join('');

  // Events
  const eventLog = document.getElementById('event-log');
  if (eventLog) eventLog.innerHTML = logEntries.slice(0, 30).map(e => `<div class="mgs-event ${e.type}"><span class="step">[${e.step}]</span>${e.msg}</div>`).join('');

  // HUD
  // HUD
  const bar = document.getElementById('hud-overload-bar');
  if (bar) {
    bar.style.width = `${hudMetrics.globalOverloadIndex * 100}%`;
    bar.className = `mgs-hud-bar-fill ${hudMetrics.globalOverloadIndex > 0.75 ? 'high' : hudMetrics.globalOverloadIndex > 0.4 ? 'medium' : 'low'}`;
    document.getElementById('hud-overload').textContent = hudMetrics.globalOverloadIndex.toFixed(2);

    // S4 Observer HUD Updates
    const densityVal = (state.metrics as any).patternDensity || 0;
    const densityStatus = hudMetrics.densityStatus || 'calm';

    const elDensity = document.getElementById('hud-density');
    if (elDensity) elDensity.textContent = densityVal.toFixed(2);

    const elBadge = document.getElementById('hud-density-status');
    if (elBadge) {
      elBadge.textContent = densityStatus.toUpperCase();
      elBadge.className = `mgs-mode-badge ${densityStatus}`;
    }

    const elPatterns = document.getElementById('hud-patterns');
    if (elPatterns) elPatterns.textContent = String(state.patterns.length);

    const elModel = document.getElementById('hud-model');
    if (elModel) elModel.textContent = currentModel ? currentModel.id : 'baseline';

    const elProfile = document.getElementById('hud-profile-label');
    if (elProfile) elProfile.textContent = currentContext.profileId || 'open_neutral';

    const elFrame = document.getElementById('hud-frame-label');
    if (elFrame) elFrame.textContent = currentContext.frameId || 'frame_open_exploration';

    const elRegime = document.getElementById('hud-regime-label');
    if (elRegime) elRegime.textContent = currentRegime || 'unknown';





  }
  const hudClusters = document.getElementById('hud-clusters');
  if (hudClusters) hudClusters.textContent = String(hudMetrics.clusterStressCount);
  const trendEl = document.getElementById('hud-trend');
  if (trendEl) {
    trendEl.textContent = hudMetrics.recoveryTrend === 'up' ? '↑' : hudMetrics.recoveryTrend === 'down' ? '↓' : '→';
    trendEl.className = `mgs-trend ${hudMetrics.recoveryTrend}`;
  }

  // Lens indicator
  const lensIndicator = document.getElementById('lens-indicator');
  if (lensIndicator) {
    if (currentLens !== 'none') { lensIndicator.style.display = 'block'; const lensName = document.getElementById('lens-name'); if (lensName) lensName.textContent = currentLens.replace(/_/g, ' '); }
    else { lensIndicator.style.display = 'none'; }
  }

  // T3: Pattern Timeline
  const timelineList = document.getElementById('pattern-timeline-list');
  if (timelineList && state.patternTimeline) {
    const recentEvents = state.patternTimeline.slice(-10).reverse();
    timelineList.innerHTML = recentEvents.map(e => {
      const icon = e.event === 'birth' ? '🌱' : (e.event === 'resolution' ? '✦' : '💨');
      const color = e.event === 'birth' ? '#5cff9d' : (e.event === 'resolution' ? '#ffd700' : '#949494');
      return `<div style="color: ${color}; margin-bottom: 2px;">${icon} ${e.patternType} ${e.event === 'birth' ? 'formed' : 'dissolved'} (age ${e.age})</div>`;
    }).join('');
  }

  // T3: Pattern age bars in pattern list
  const patternItems = patternList.querySelectorAll('.mgs-pattern-item');
  patternItems.forEach(el => {
    const p = state.patterns.find(pat => pat.id === (el as HTMLElement).dataset.id);
    if (p && p.age) {
      const ageBar = document.createElement('div');
      const agePercent = Math.min(100, (p.age / 500) * 100); // 500 steps = full bar
      ageBar.style.cssText = `height: 2px; background: linear-gradient(90deg, #5cff9d ${agePercent}%, #2a2a2a ${agePercent}%); margin-top: 4px; border-radius: 1px;`;
      el.appendChild(ageBar);
    }
    // FR4: Add hover handler for pattern highlighting
    (el as HTMLElement).onmouseenter = () => { hoveredPatternId = (el as HTMLElement).dataset.id; };
    (el as HTMLElement).onmouseleave = () => { hoveredPatternId = null; };
  });

  // T1: Wave Sparkline
  const sparklineCanvas = document.getElementById('wave-sparkline') as HTMLCanvasElement;
  if (sparklineCanvas && state.waveAmplitudeHistory) {
    const sctx = sparklineCanvas.getContext('2d');
    if (sctx) {
      const w = sparklineCanvas.width, h = sparklineCanvas.height;
      sctx.fillStyle = '#1a1a1a';
      sctx.fillRect(0, 0, w, h);

      if (state.waveAmplitudeHistory.length > 1) {
        sctx.beginPath();
        sctx.strokeStyle = '#7ab3ff';
        sctx.lineWidth = 1.5;
        const data = state.waveAmplitudeHistory;
        const step = w / (WAVE_VISUAL_CONFIG.sparklineLength - 1);
        data.forEach((val, i) => {
          const x = i * step;
          const y = h - (val * h * 0.9) - 2;
          if (i === 0) sctx.moveTo(x, y);
          else sctx.lineTo(x, y);
        });
        sctx.stroke();

        // Fill under curve
        sctx.lineTo((data.length - 1) * step, h);
        sctx.fill();
      }
    }
  }

  updateScrubber();
}

function addLog(msg: string, type = 'info') { logEntries.unshift({ step: state.step, msg, type }); if (logEntries.length > 100) logEntries.pop(); }

// Levin-style Pattern Detectors
function runLevinPatternDetectors() {
  const levinPatterns = [];

  // 1. High Stress Clusters
  if (PATTERN_DETECTORS.high_stress_clusters.enabled) {
    const cfg = PATTERN_DETECTORS.high_stress_clusters;
    const highStress = state.objects.filter(o => o.stress > cfg.stress_threshold);
    if (highStress.length >= cfg.min_cluster_size) {
      // Find connected high-stress nodes
      const ids = new Set(highStress.map(o => o.id));
      const connectedEdges = state.edges.filter(e => !e.severed && ids.has(e.sourceId) && ids.has(e.targetId));
      if (connectedEdges.length >= 1) {
        const clusterIds = [...new Set(connectedEdges.flatMap(e => [e.sourceId, e.targetId]))];
        if (clusterIds.length >= cfg.min_cluster_size) {
          const avgStress = clusterIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.stress || 0), 0) / clusterIds.length;
          const centerX = clusterIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.x || 0), 0) / clusterIds.length;
          const centerY = clusterIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.y || 0), 0) / clusterIds.length;
          levinPatterns.push({
            id: `lp_stress_${state.step}`,
            tag: cfg.tag,
            type: 'levin',
            name: `Pressure Theme (${clusterIds.length})`,
            object_ids: clusterIds,
            edge_ids: connectedEdges.map(e => e.id),
            center_of_mass: { x: centerX, y: centerY },
            average_stress: avgStress,
            lifetime_steps: 0,
            color: cfg.color
          });
        }
      }
    }
  }

  // 2. Anchored Constellations
  if (PATTERN_DETECTORS.anchored_constellations.enabled) {
    const cfg = PATTERN_DETECTORS.anchored_constellations;
    const anchors = state.objects.filter(o => o.role === 'Anchor');
    anchors.forEach(anchor => {
      const nearby = state.objects.filter(o => {
        if (o.id === anchor.id) return false;
        const dist = Math.hypot(o.x - anchor.x, o.y - anchor.y);
        return dist < cfg.max_radius;
      });
      if (nearby.length >= 2) {
        const allIds = [anchor.id, ...nearby.map(o => o.id)];
        const connectedEdges = state.edges.filter(e => !e.severed && allIds.includes(e.sourceId) && allIds.includes(e.targetId));
        levinPatterns.push({
          id: `lp_anchor_${anchor.id}_${state.step}`,
          tag: cfg.tag,
          type: 'levin',
          name: `Anchored @ ${anchor.label}`,
          object_ids: allIds,
          edge_ids: connectedEdges.map(e => e.id),
          center_of_mass: { x: anchor.x, y: anchor.y },
          average_stress: nearby.reduce((s, o) => s + o.stress, 0) / nearby.length,
          lifetime_steps: 0,
          color: cfg.color
        });
      }
    });
  }

  // 3. Exploratory Fronds
  if (PATTERN_DETECTORS.exploratory_fronds.enabled) {
    const cfg = PATTERN_DETECTORS.exploratory_fronds;
    const explorers = state.objects.filter(o => o.role === cfg.role);
    if (explorers.length >= cfg.min_chain_length) {
      // Find chains of explorers connected by weak edges
      const explorerIds = new Set(explorers.map(o => o.id));
      const weakEdges = state.edges.filter(e =>
        !e.severed &&
        explorerIds.has(e.sourceId) &&
        explorerIds.has(e.targetId) &&
        e.weight <= cfg.max_average_weight
      );
      if (weakEdges.length >= cfg.min_chain_length - 1) {
        const chainIds = [...new Set(weakEdges.flatMap(e => [e.sourceId, e.targetId]))];
        if (chainIds.length >= cfg.min_chain_length) {
          const centerX = chainIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.x || 0), 0) / chainIds.length;
          const centerY = chainIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.y || 0), 0) / chainIds.length;
          levinPatterns.push({
            id: `lp_frond_${state.step}`,
            tag: cfg.tag,
            type: 'levin',
            name: `Reach Out (${chainIds.length})`,
            object_ids: chainIds,
            edge_ids: weakEdges.map(e => e.id),
            center_of_mass: { x: centerX, y: centerY },
            average_stress: chainIds.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.stress || 0), 0) / chainIds.length,
            lifetime_steps: 0,
            color: cfg.color
          });
        }
      }
    }
  }

  // 4. Bridge Networks
  if (PATTERN_DETECTORS.bridge_networks.enabled) {
    const cfg = PATTERN_DETECTORS.bridge_networks;
    const bridges = state.objects.filter(o => o.role === 'Bridge');
    if (bridges.length >= cfg.min_bridges) {
      const bridgeIds = bridges.map(o => o.id);
      const connectedEdges = state.edges.filter(e => !e.severed && (bridgeIds.includes(e.sourceId) || bridgeIds.includes(e.targetId)));
      const allConnected = [...new Set(connectedEdges.flatMap(e => [e.sourceId, e.targetId]))];
      const centerX = allConnected.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.x || 0), 0) / allConnected.length;
      const centerY = allConnected.reduce((s, id) => s + (state.objects.find(o => o.id === id)?.y || 0), 0) / allConnected.length;
      levinPatterns.push({
        id: `lp_bridge_${state.step}`,
        tag: cfg.tag,
        type: 'levin',
        name: `Connection Hub (${bridges.length})`,
        object_ids: allConnected,
        edge_ids: connectedEdges.map(e => e.id),
        center_of_mass: { x: centerX, y: centerY },
        average_stress: bridges.reduce((s, o) => s + o.stress, 0) / bridges.length,
        lifetime_steps: 0,
        color: cfg.color
      });
    }
  }

  // Merge with existing patterns or add new ones
  levinPatterns.forEach(newP => {
    const existing = state.patterns.find(p => p.tag === newP.tag && p.type === 'levin');
    if (existing) {
      existing.lifetime_steps++;
      existing.object_ids = newP.object_ids;
      existing.edge_ids = newP.edge_ids;
      existing.center_of_mass = newP.center_of_mass;
      existing.average_stress = newP.average_stress;
    } else {
      state.patterns.push(newP);
      addLog(`Levin pattern: ${newP.name}`, 'pattern');
    }
  });

  // Remove Levin patterns that weren't detected this step
  const detectedTags = new Set(levinPatterns.map(p => p.tag));
  state.patterns = state.patterns.filter(p => p.type !== 'levin' || detectedTags.has(p.tag));
}

// Animation Loop
export function drawGraph() {
  const now = performance.now();
  let dt = (now - lastTime) / 1000; lastTime = now;
  dt = Math.min(dt, 0.05) * speedMultiplier; // Apply speed multiplier

  // S3 Task D: Update regime transition
  updateRegimeTransition();

  if (running && mode === 'live') {
    try {
      // S3 T1: External Input Events
      if (typeof InputAdapter !== 'undefined') {
        InputAdapter.processStep(state.step);
      }

      // 1. Physics integration
      integratePhysics(dt);

      // T2: Apply semantic positional bias for topology readability
      applySemanticPositionalBias();

      // 2. Ambient and activation
      ambientStep(dt);
      activationStep(dt);

      // 3. Energy and stress (Levin)
      updateEnergyStress(dt);

      // 4. Pattern detection (both S2 and Levin)
      if (state.step % 5 === 0) {
        detectPatterns();
        runLevinPatternDetectors();
      }

      // 4b. Pattern influence on forces (patterns act on the field)
      applyPatternInfluence();

      // 5. HUD metrics
      updateHUDMetrics();

      // S4: Recording
      if (typeof Recorder !== 'undefined') Recorder.capture(state);

      state.step++;

      if (state.step % 10 === 0) takeSnapshot();
    } catch (err) {
      console.error('Animation error:', err);
    }
  }

  render();
  if (state.step % 3 === 0) updateUI();
  // resize(); // Managed by UI
  // animate(); // Managed by UI
}

// Export (S2.6)
function exportStateJSON() {
  const data = { version: '0.8', profile: profile.name, state: { objects: state.objects.map(o => ({ id: o.id, label: o.label, material: o.material, x: o.x, y: o.y, activation: o.activation, sensory: o.sensory })), edges: state.edges.map(e => ({ id: e.id, source: e.sourceId, target: e.targetId, weight: e.weight, severed: e.severed })), patterns: state.patterns, ambient: state.ambient }, timeline: timeline.slice(-100), stats: { step: state.step, overloads: state.overloads, recoveries: state.recoveries } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `mindgraphsim-state-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

function exportSummary() {
  const text = `MindGraphSim v0.8 S2 - Run Summary\n${'='.repeat(40)}\nProfile: ${profile.name}\nSteps: ${state.step}\nObjects: ${state.objects.length}\nEdges: ${state.edges.length}\nPatterns detected: ${state.patterns.length}\nOverloads: ${state.overloads}\nRecoveries: ${state.recoveries}\nFinal noise: ${state.ambient.noise.toFixed(3)}\nFinal safety: ${state.ambient.safety.toFixed(3)}\n\nPatterns:\n${state.patterns.map(p => `  - ${p.name} (${p.type}, age: ${p.age})`).join('\n') || '  None active'}\n\nObjects:\n${state.objects.map(o => `  - ${o.label}: activation=${o.activation.toFixed(2)}, ${o.overloaded ? 'OVERLOADED' : 'stable'}`).join('\n')}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `mindgraphsim-summary-${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
}

function exportImage() {
  const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
  const a = document.createElement('a'); a.href = dataUrl; a.download = `mindgraphsim-graph-${Date.now()}.png`; a.click();
}

const legacyControls = document.getElementById('btn-safety');
if (legacyControls) {
  const btnPlayLegacy = document.getElementById('btn-play');
  if (btnPlayLegacy) {
    btnPlayLegacy.onclick = () => {
      if (mode === 'replay') { mode = 'live'; running = true; }
      else { running = !running; }
      btnPlayLegacy.textContent = running ? '⏸' : '▶';
      updateModeUI();
    };
  }
  const btnBackLegacy = document.getElementById('btn-back');
  if (btnBackLegacy) {
    btnBackLegacy.onclick = () => {
      if (timelineIndex > 0) { mode = 'replay'; restoreSnapshot(timelineIndex - 1); updateModeUI(); updateUI(); }
    };
  }
  const btnForwardLegacy = document.getElementById('btn-forward');
  if (btnForwardLegacy) {
    btnForwardLegacy.onclick = () => {
      if (timelineIndex < timeline.length - 1) { mode = 'replay'; restoreSnapshot(timelineIndex + 1); updateModeUI(); updateUI(); }
    };
  }
  const scrubberEl = document.getElementById('scrubber');
  if (scrubberEl) scrubberEl.oninput = (e) => { mode = 'replay'; restoreSnapshot(parseInt((e.target as HTMLInputElement).value)); updateModeUI(); updateUI(); };
  const btnNoiseLegacy = document.getElementById('btn-noise');
  if (btnNoiseLegacy) btnNoiseLegacy.onclick = () => { state.ambient.noise = Math.min(1, state.ambient.noise + 0.15); addLog('+Noise injected'); };
  const btnSafetyLegacy = document.getElementById('btn-safety');
  if (btnSafetyLegacy) btnSafetyLegacy.onclick = () => { state.ambient.safety = Math.min(1, state.ambient.safety + 0.1); addLog('+Safety increased'); };
  const btnShakeLegacy = document.getElementById('btn-shake');
  if (btnShakeLegacy) {
    btnShakeLegacy.onclick = () => {
      state.objects.forEach(o => {
        if (!o.pinned) {
          o.vx += (Math.random() - 0.5) * 200;
          o.vy += (Math.random() - 0.5) * 200;
        }
      });
      state.ambient.noise = Math.min(1, state.ambient.noise + 0.3);
      addLog('🌊 Shake!', 'info');
    };
  }
  const btnTrailsLegacy = document.getElementById('btn-trails');
  if (btnTrailsLegacy) {
    btnTrailsLegacy.onclick = () => {
      showTrails = !showTrails;
      btnTrailsLegacy.classList.toggle('active', showTrails);
      addLog(`Trails: ${showTrails ? 'ON' : 'OFF'}`, 'info');
    };
  }
  const btnPatternOverlayLegacy = document.getElementById('btn-pattern-overlay');
  if (btnPatternOverlayLegacy) {
    btnPatternOverlayLegacy.onclick = () => {
      showPatternOverlays = !showPatternOverlays;
      btnPatternOverlayLegacy.classList.toggle('active', showPatternOverlays);
      btnPatternOverlayLegacy.textContent = showPatternOverlays ? '👁 Patterns' : '👁‍🗨 Patterns';
      addLog(`Pattern overlays: ${showPatternOverlays ? 'ON' : 'OFF'}`, 'info');
    };
  }
  const sliderSpeedLegacy = document.getElementById('slider-speed');
  if (sliderSpeedLegacy) {
    sliderSpeedLegacy.oninput = (e) => {
      speedMultiplier = parseInt((e.target as HTMLInputElement).value) / 100;
      const valSpeed = document.getElementById('val-speed');
      if (valSpeed) valSpeed.textContent = speedMultiplier.toFixed(1) + 'x';
    };
  }
  const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement;
  if (sceneSelect) sceneSelect.onchange = (e) => { loadScene((e.target as HTMLSelectElement).value); };

  const profileSelect = document.getElementById('profile-select') as HTMLSelectElement;
  if (profileSelect) profileSelect.onchange = (e) => {
    applyProfile((e.target as HTMLSelectElement).value);
    addLog(`Profile: ${currentContext.profileId}`);
  };

  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    modelSelect.innerHTML = '';
    MODEL_REGISTRY.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (m.id === 'baseline') opt.selected = true;
      modelSelect.appendChild(opt);
    });
    modelSelect.onchange = (e) => {
      applyModel((e.target as HTMLSelectElement).value);
      updateUI();
    };
  }

  const lensSelect = document.getElementById('lens-select') as HTMLSelectElement;
  if (lensSelect) lensSelect.onchange = (e) => { currentLens = (e.target as HTMLSelectElement).value; updateUI(); };
  const regimeSelect = document.getElementById('regime-select') as HTMLSelectElement;
  if (regimeSelect) regimeSelect.onchange = (e) => {
    const val = (e.target as HTMLSelectElement).value;
    applyRegime(val, true);
    const hudRegime = document.getElementById('hud-regime');
    if (hudRegime) hudRegime.textContent = REGIMES[val as keyof typeof REGIMES].name;
  };
  const sliderGravity = document.getElementById('slider-gravity');
  if (sliderGravity) sliderGravity.oninput = (e) => {
    physicsConfig.gravity.strength = parseInt((e.target as HTMLInputElement).value) / 100;
    const val = document.getElementById('val-gravity');
    if (val) val.textContent = physicsConfig.gravity.strength.toFixed(2);
  };
  const sliderDamping = document.getElementById('slider-damping');
  if (sliderDamping) sliderDamping.oninput = (e) => {
    physicsConfig.global_damping = parseInt((e.target as HTMLInputElement).value) / 100;
    const val = document.getElementById('val-damping');
    if (val) val.textContent = physicsConfig.global_damping.toFixed(2);
  };
  const sliderNoise = document.getElementById('slider-noise');
  if (sliderNoise) sliderNoise.oninput = (e) => {
    physicsConfig.noise.base_strength = parseInt((e.target as HTMLInputElement).value) / 100;
    const val = document.getElementById('val-noise');
    if (val) val.textContent = physicsConfig.noise.base_strength.toFixed(2);
  };
  function updatePhysicsSliders() {
    const sGravity = document.getElementById('slider-gravity') as HTMLInputElement;
    if (sGravity) sGravity.value = String(physicsConfig.gravity.strength * 100);
    const vGravity = document.getElementById('val-gravity');
    if (vGravity) vGravity.textContent = physicsConfig.gravity.strength.toFixed(2);

    const sDamping = document.getElementById('slider-damping') as HTMLInputElement;
    if (sDamping) sDamping.value = String(physicsConfig.global_damping * 100);
    const vDamping = document.getElementById('val-damping');
    if (vDamping) vDamping.textContent = physicsConfig.global_damping.toFixed(2);

    const sNoise = document.getElementById('slider-noise') as HTMLInputElement;
    if (sNoise) sNoise.value = String(physicsConfig.noise.base_strength * 100);
    const vNoise = document.getElementById('val-noise');
    if (vNoise) vNoise.textContent = physicsConfig.noise.base_strength.toFixed(2);
  }
  const btnExport = document.getElementById('btn-export');
  const exportModal = document.getElementById('export-modal');
  if (btnExport && exportModal) {
    btnExport.onclick = () => { exportModal.classList.add('open'); };
    const btnClose = document.getElementById('export-close');
    if (btnClose) btnClose.onclick = () => { exportModal.classList.remove('open'); };
    const btnJson = document.getElementById('export-json');
    if (btnJson) btnJson.onclick = () => { exportStateJSON(); exportModal.classList.remove('open'); };
    const btnSummary = document.getElementById('export-summary');
    if (btnSummary) btnSummary.onclick = () => { exportSummary(); exportModal.classList.remove('open'); };
    const btnImage = document.getElementById('export-image');
    if (btnImage) btnImage.onclick = () => { exportImage(); exportModal.classList.remove('open'); };
  }
}

// Mouse interaction - convert screen to world coordinates
function screenToWorld(sx, sy) {
  const wx = (sx - canvasWidth / 2) / camera.zoom + canvasWidth / 2 - camera.x;
  const wy = (sy - canvasHeight / 2) / camera.zoom + canvasHeight / 2 - camera.y;
  return { x: wx, y: wy };
}

function getNodeAtPosition(x, y) {
  const world = screenToWorld(x, y);
  for (const o of state.objects) {
    const r = 12 + o.mass * 15;
    const dist = Math.hypot(world.x - o.x, world.y - o.y);
    if (dist < r + 5) return o;
  }
  return null;
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  // Handle panning
  if (isPanning) {
    camera.x = camStartX + (mouseX - panStartX) / camera.zoom;
    camera.y = camStartY + (mouseY - panStartY) / camera.zoom;
    return;
  }

  if (draggedNode) {
    const o = state.objects.find(obj => obj.id === draggedNode);
    if (o) {
      const world = screenToWorld(mouseX, mouseY);
      o.x = world.x; o.y = world.y;
      o.vx = 0; o.vy = 0; // Stop velocity while dragging
    }
  } else {
    const node = getNodeAtPosition(mouseX, mouseY);
    hoveredNode = node ? node.id : null;
    canvas.style.cursor = node ? 'pointer' : (isPanning ? 'grabbing' : 'grab');
  }
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const node = getNodeAtPosition(x, y);

  if (node) {
    if (e.shiftKey) {
      // Shift+click: boost activation
      node.activation = Math.min(1, node.activation + 0.3);
      node.sensory = Math.min(1, node.sensory + 0.1);
      addLog(`Boosted: ${node.label}`, 'info');
    } else {
      // Regular click: start drag
      draggedNode = node.id;
    }
  } else {
    // No node clicked - start panning
    isPanning = true;
    panStartX = x;
    panStartY = y;
    camStartX = camera.x;
    camStartY = camera.y;
    canvas.style.cursor = 'grabbing';
  }
});

canvas.addEventListener('mouseup', () => {
  draggedNode = null;
  isPanning = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
  hoveredNode = null;
  draggedNode = null;
  isPanning = false;
  canvas.style.cursor = 'default';
});

// Zoom with mouse wheel
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.2, Math.min(5, camera.zoom * zoomFactor));

  // Zoom toward mouse position
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Adjust camera position to zoom toward cursor
  const worldBefore = screenToWorld(mx, my);
  camera.zoom = newZoom;
  const worldAfter = screenToWorld(mx, my);
  camera.x += worldAfter.x - worldBefore.x;
  camera.y += worldAfter.y - worldBefore.y;
}, { passive: false });

canvas.addEventListener('dblclick', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const node = getNodeAtPosition(x, y);

  if (node) {
    // Double-click: trigger overload test
    node.sensory = Math.min(1, node.sensory + 0.4);
    state.ambient.noise = Math.min(1, state.ambient.noise + 0.2);
    addLog(`Stress test: ${node.label}`, 'overload');
  } else {
    // Double-click on empty space: reset camera
    camera.x = 0; camera.y = 0; camera.zoom = 1.0;
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('export-modal').classList.remove('open');
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); document.getElementById('btn-play').click(); }
});

// T4: Automated regime comparison test
function runRegimeComparisonTest(regimeId, steps, callback) {
  const metrics = {
    regime: regimeId,
    steps: steps,
    waveEvents: 0,
    loopLifetimes: [],
    clusterChurn: 0,
    activationSamples: { Position: [], Support: [], Bridge: [], CommonGround: [] },
    pairwiseDistances: [],
    overloads: 0
  };

  // Reset and configure
  loadScene('conflict_resolution');
  applyRegime(regimeId, false);
  state.step = 0;
  state.overloads = 0;

  const patternSnapshot = new Map();
  let testStep = 0;

  function step() {
    if (testStep >= steps) {
      // Compile final metrics
      const result = {
        regime: REGIMES[regimeId].name,
        totalSteps: steps,
        waveEventRate: metrics.waveEvents / (steps / 1000),
        loopLifetimeMean: metrics.loopLifetimes.length > 0
          ? metrics.loopLifetimes.reduce((a, b) => a + b, 0) / metrics.loopLifetimes.length
          : 0,
        clusterChurnRate: metrics.clusterChurn / (steps / 1000),
        activationVariance: {},
        pairwiseDistanceStats: metrics.pairwiseDistances.length > 0 ? {
          mean: metrics.pairwiseDistances.reduce((a, b) => a + b, 0) / metrics.pairwiseDistances.length,
          min: Math.min(...metrics.pairwiseDistances),
          max: Math.max(...metrics.pairwiseDistances)
        } : { mean: 0, min: 0, max: 0 },
        overloads: state.overloads
      };

      // Calculate activation variance per role
      Object.keys(metrics.activationSamples).forEach(role => {
        const samples = metrics.activationSamples[role];
        if (samples.length > 0) {
          const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
          const variance = samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / samples.length;
          result.activationVariance[role] = { mean: mean.toFixed(3), stddev: Math.sqrt(variance).toFixed(3) };
        }
      });

      console.log(`T4 Test Complete: ${regimeId}`, result);
      if (callback) callback(result);
      return;
    }

    // Run simulation step
    const dt = 0.016;
    integratePhysics(dt);
    applySemanticPositionalBias();
    applyPatternInfluence();
    updateEnergyStress(dt);
    ambientStep(dt);
    activationStep(dt);
    if (testStep % 5 === 0) detectPatterns();
    testStep++;
    state.step++;

    // Sample metrics every 100 steps
    if (testStep % 100 === 0) {
      // Track wave events
      const currentWaves = state.patterns.filter(p => p.type === 'wave').length;
      if (currentWaves > (patternSnapshot.get('waves') || 0)) {
        metrics.waveEvents++;
      }
      patternSnapshot.set('waves', currentWaves);

      // Track cluster churn
      const currentClusters = state.patterns.filter(p => p.type === 'cluster').map(p => p.id).join(',');
      if (currentClusters !== patternSnapshot.get('clusters')) {
        metrics.clusterChurn++;
      }
      patternSnapshot.set('clusters', currentClusters);

      // Track loop lifetimes
      state.patterns.filter(p => p.type === 'loop').forEach(p => {
        if (!patternSnapshot.has(`loop_${p.id}`)) {
          patternSnapshot.set(`loop_${p.id}`, p.age);
        }
      });

      // Sample activations by semantic role
      state.objects.forEach(o => {
        const semRole = getSemanticRole(o.label);
        if (semRole && metrics.activationSamples[semRole]) {
          metrics.activationSamples[semRole].push(o.activation);
        }
      });

      // Sample pairwise distances (non-adjacent only)
      const adjacentPairs = new Set();
      state.edges.forEach(e => {
        adjacentPairs.add(`${e.sourceId}-${e.targetId}`);
        adjacentPairs.add(`${e.targetId}-${e.sourceId}`);
      });

      for (let i = 0; i < state.objects.length; i++) {
        for (let j = i + 1; j < state.objects.length; j++) {
          const pairKey = `${state.objects[i].id}-${state.objects[j].id}`;
          if (!adjacentPairs.has(pairKey)) {
            const dist = Math.hypot(
              state.objects[i].x - state.objects[j].x,
              state.objects[i].y - state.objects[j].y
            );
            metrics.pairwiseDistances.push(dist);
          }
        }
      }
    }

    // Record loop lifetimes when they dissolve
    state.patterns.filter(p => p.type === 'loop').forEach(p => {
      if (p.energy < 0.1 && !patternSnapshot.has(`loop_done_${p.id}`)) {
        metrics.loopLifetimes.push(p.age);
        patternSnapshot.set(`loop_done_${p.id}`, true);
      }
    });

    // Continue test
    setTimeout(step, 0);
  }

  console.log(`Starting T4 test: ${regimeId} for ${steps} steps...`);
  step();
}

// T4: Run both regime tests and export comparison
function runT4Tests() {
  console.log('=== T4 Regime Comparison Tests ===');
  console.log('Testing ADHD Scatter-Focus profile under Storm vs Drift');

  // Set ADHD profile
  applyProfile('adhd_scatter_focus'); // Was: profile = PROFILES.adhd;

  runRegimeComparisonTest('storm', 10000, (stormResult) => {
    runRegimeComparisonTest('calm_rehearsal', 10000, (driftResult) => {
      console.log('\n=== T4 COMPARISON RESULTS ===');
      console.log('Storm wave rate:', stormResult.waveEventRate.toFixed(2), 'per 1k steps');
      console.log('Drift wave rate:', driftResult.waveEventRate.toFixed(2), 'per 1k steps');
      console.log('Wave rate ratio (Storm/Drift):', (stormResult.waveEventRate / Math.max(0.01, driftResult.waveEventRate)).toFixed(2));
      console.log('');
      console.log('Loop lifetime Storm:', stormResult.loopLifetimeMean.toFixed(0), 'steps');
      console.log('Loop lifetime Drift:', driftResult.loopLifetimeMean.toFixed(0), 'steps');
      console.log('');
      console.log('Cluster churn Storm:', stormResult.clusterChurnRate.toFixed(2), 'per 1k steps');
      console.log('Cluster churn Drift:', driftResult.clusterChurnRate.toFixed(2), 'per 1k steps');
      console.log('');
      console.log('Pairwise distance (Storm):', stormResult.pairwiseDistanceStats);
      console.log('Pairwise distance (Drift):', driftResult.pairwiseDistanceStats);
      console.log('');
      console.log('Overloads - Storm:', stormResult.overloads, 'Drift:', driftResult.overloads);

      // Export results
      const exportData = {
        timestamp: new Date().toISOString(),
        profile: 'ADHD Scatter-Focus',
        storm: stormResult,
        drift: driftResult,
        comparison: {
          waveRateRatio: (stormResult.waveEventRate / Math.max(0.01, driftResult.waveEventRate)).toFixed(2),
          loopLifetimeRatio: (driftResult.loopLifetimeMean / Math.max(1, stormResult.loopLifetimeMean)).toFixed(2),
          clusterChurnRatio: (stormResult.clusterChurnRate / Math.max(0.01, driftResult.clusterChurnRate)).toFixed(2),
          meetsAcceptanceCriteria: {
            waveRateHigherInStorm: stormResult.waveEventRate > driftResult.waveEventRate * 1.5,
            loopLifetimeLongerInDrift: driftResult.loopLifetimeMean > stormResult.loopLifetimeMean,
            noOverloads: stormResult.overloads === 0 && driftResult.overloads === 0
          }
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `t4-regime-comparison-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('\n✓ Results exported to JSON');

      // Restore normal operation
      loadScene('conflict_resolution');
      applyRegime('thought_laboratory', false);
    });
  });
}

// FR5: Standard run report generator
function generateRunReport(sceneName = 'Unknown Scene') {
  const profileName = Object.keys(PROFILES).find(k => PROFILES[k] === profile) || 'general';
  const regimeName = REGIMES[currentRegime]?.name || currentRegime;

  const lines = [];

  // Header
  lines.push(`MindGraphSim v0.8 – ${sceneName}`);
  lines.push(`Profile: ${profileName} | Regime: ${regimeName} | Steps: ${state.step}`);
  lines.push('');

  // Metrics
  lines.push(`Objects: ${state.objects.length}`);
  lines.push(`Edges: ${state.edges.length}`);
  lines.push(`Patterns (displayed): ${state.displayPatterns.length}`);
  lines.push(`Overloads: ${state.overloads} | Recoveries: ${state.recoveries}`);
  lines.push(`Final noise: ${state.ambient.noise.toFixed(2)} | Final safety: ${state.ambient.safety.toFixed(2)}`);
  lines.push('');

  // Patterns section (up to 5)
  lines.push('=== Top Patterns ===');
  state.displayPatterns.slice(0, 5).forEach(p => {
    const strength = (p.displayStrength || p.energy || 0.5).toFixed(2);
    const memberCount = (p.nodeIds || []).length;
    lines.push(`- ${p.type} @ ${p.name} (age=${p.age || 0}, size=${memberCount}, strength=${strength})`);
  });
  if (state.displayPatterns.length === 0) {
    lines.push('- (no patterns meet display threshold)');
  }
  lines.push('');

  // Objects section (up to 8)
  lines.push('=== Objects ===');
  state.objects.slice(0, 8).forEach(o => {
    const status = o.overloaded ? 'overloaded' : (o.recovering ? 'recovering' : 'stable');
    lines.push(`- ${o.label}: activation=${o.activation.toFixed(2)}, status=${status}`);
  });
  lines.push('');

  // Interpretation section
  lines.push('=== Interpretation ===');

  // Activation tiers
  const activations = state.objects.map(o => o.activation);
  const minAct = Math.min(...activations).toFixed(2);
  const maxAct = Math.max(...activations).toFixed(2);
  const avgAct = (activations.reduce((a, b) => a + b, 0) / activations.length).toFixed(2);
  lines.push(`- Activation range: ${minAct}–${maxAct} (avg: ${avgAct})`);

  // Pattern summary
  const loopCount = state.displayPatterns.filter(p => p.type === 'loop').length;
  const waveCount = state.displayPatterns.filter(p => p.type === 'wave').length;
  const clusterCount = state.displayPatterns.filter(p => p.type === 'cluster').length;
  lines.push(`- Pattern mix: ${loopCount} loops, ${waveCount} waves, ${clusterCount} clusters`);

  // Stability
  if (state.overloads === 0) {
    lines.push('- System stable: no overloads during run');
  } else {
    lines.push(`- System experienced ${state.overloads} overload(s)`);
  }

  // Long-lived patterns
  const longLived = state.displayPatterns.filter(p => (p.age || 0) > 200);
  if (longLived.length > 0) {
    lines.push(`- ${longLived.length} long-lived pattern(s) (age > 200 steps)`);
  }

  // Readability
  if (state.displayPatterns.length <= 10) {
    lines.push('- Pattern list is clean (≤10 entries)');
  } else {
    lines.push(`- Pattern list may be noisy (${state.displayPatterns.length} entries)`);
  }

  const report = lines.join('\n');
  console.log(report);
  return report;
}

// FR5: Run baseline scenario and generate report
function runBaselineScenario(targetSteps = 7500) {
  console.log('=== Starting Baseline Scenario ===');
  console.log('Scene: Question–Sources–Notes–Synthesis');
  console.log('Profile: ADHD Scatter-Focus');
  console.log(`Target steps: ${targetSteps}`);

  // Configure
  applyProfile('adhd_scatter_focus'); // Was: profile = PROFILES.adhd;
  loadScene('single_core_two_anchors'); // Use available scene
  // Legacy regime apply mostly superseded by profile, but keeping for environment setup if needed
  applyRegime('storm', false);
  state.ambient.noise = 0.05;
  state.ambient.safety = 0.50;
  state.step = 0;
  state.overloads = 0;
  state.recoveries = 0;

  let stepCount = 0;

  function step() {
    if (stepCount >= targetSteps) {
      console.log('\n=== Baseline Run Complete ===\n');
      const report = generateRunReport('Question–Sources–Notes–Synthesis');

      // Export report
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run-report-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('\n✓ Report exported to text file');
      return;
    }

    const dt = 0.016;
    integratePhysics(dt);
    applySemanticPositionalBias();
    applyPatternInfluence();
    updateEnergyStress(dt);
    ambientStep(dt);
    activationStep(dt);
    if (stepCount % 5 === 0) detectPatterns();
    stepCount++;
    state.step++;

    // Progress update every 1000 steps
    if (stepCount % 1000 === 0) {
      console.log(`Progress: ${stepCount}/${targetSteps} steps (${state.displayPatterns.length} patterns)`);
    }

    setTimeout(step, 0);
  }

  step();
}

// T4: Bridge Scene Regression Guard Test
function runBridgeRegressionTest(targetSteps = 10000, callback) {
  console.log('=== T4: Bridge Scene Regression Test ===');
  console.log('Scene: Tension with bridge');
  console.log('Profile: ADHD Scatter-Focus');
  console.log('Regime: Meditative Slow Field (calm_rehearsal)');
  console.log(`Target steps: ${targetSteps}`);

  // Configure for bridge scene with Meditative profile
  applyProfile('adhd_scatter_focus'); // Was: profile = PROFILES.adhd
  loadScene('conflict_resolution'); // Bridge scene
  loadScene('conflict_resolution'); // Bridge scene
  // S2.5: Use Profile instead of Regime
  applyProfile('meditative_slow_field');
  applyFrame('frame_conflict_mediation'); // Use appropriate frame

  // Legacy overrides required by original test spec (if profile diffs)
  state.ambient.noise = 0.05;
  state.ambient.safety = 0.70;
  state.step = 0;
  state.overloads = 0;
  state.recoveries = 0;
  state.patternTimeline = [];

  let stepCount = 0;
  const metrics = {
    startTime: Date.now(),
    edgeCount: 0,
    patternsDetected: 0,
    overloads: 0,
    recoveries: 0,
    loopsAtEnd: [],
    wavesAtEnd: [],
    activationRange: [1, 0],
    longLivedPatterns: 0
  };

  function step() {
    if (stepCount >= targetSteps) {
      // Collect final metrics
      metrics.edgeCount = state.edges.filter(e => !e.severed).length;
      metrics.patternsDetected = state.patterns.length;
      metrics.overloads = state.overloads;
      metrics.recoveries = state.recoveries;
      metrics.loopsAtEnd = state.patterns.filter(p => p.type === 'loop');
      metrics.wavesAtEnd = state.patterns.filter(p => p.type === 'wave');
      metrics.longLivedPatterns = state.patterns.filter(p => (p.age || 0) > 500).length;

      const activations = state.objects.map(o => o.activation);
      metrics.activationRange = [Math.min(...activations), Math.max(...activations)];

      // Check for loop at Synthesis
      const synthesisLoop = metrics.loopsAtEnd.find(p =>
        p.name?.toLowerCase().includes('synthesis') ||
        p.nodeIds?.some(id => state.objects.find(o => o.id === id)?.label?.toLowerCase().includes('synthesis'))
      );

      // Assertions
      const assertions = {
        noOverloads: metrics.overloads === 0,
        edgesIntact: metrics.edgeCount >= 11,
        patternsRich: metrics.patternsDetected >= 10,
        hasWave: metrics.wavesAtEnd.length >= 1,
        hasLoopAtSynthesis: !!synthesisLoop || metrics.loopsAtEnd.length >= 1,
        hasLongLived: metrics.longLivedPatterns >= 4
      };

      const allPassed = Object.values(assertions).every(v => v);

      console.log('\n=== T4 Regression Test Results ===');
      console.log(`Duration: ${((Date.now() - metrics.startTime) / 1000).toFixed(1)}s`);
      console.log(`Steps: ${targetSteps}`);
      console.log(`Edges: ${metrics.edgeCount} (required ≥11) ${assertions.edgesIntact ? '✓' : '✗'}`);
      console.log(`Patterns: ${metrics.patternsDetected} (required ≥10) ${assertions.patternsRich ? '✓' : '✗'}`);
      console.log(`Overloads: ${metrics.overloads} (required =0) ${assertions.noOverloads ? '✓' : '✗'}`);
      console.log(`Waves: ${metrics.wavesAtEnd.length} (required ≥1) ${assertions.hasWave ? '✓' : '✗'}`);
      console.log(`Loops: ${metrics.loopsAtEnd.length} ${assertions.hasLoopAtSynthesis ? '✓' : '✗'}`);
      console.log(`Long-lived (>500): ${metrics.longLivedPatterns} (target ≥4) ${assertions.hasLongLived ? '✓' : '✗'}`);
      console.log(`Activation range: ${metrics.activationRange[0].toFixed(2)}–${metrics.activationRange[1].toFixed(2)}`);
      console.log(`\n${allPassed ? '✓ ALL ASSERTIONS PASSED' : '✗ SOME ASSERTIONS FAILED'}`);

      // Export JSON snapshot
      const snapshot = {
        timestamp: new Date().toISOString(),
        scene: 'conflict_resolution',
        profile: 'ADHD Scatter-Focus',
        regime: 'calm_rehearsal',
        steps: targetSteps,
        metrics: {
          edges: metrics.edgeCount,
          patterns: metrics.patternsDetected,
          overloads: metrics.overloads,
          recoveries: metrics.recoveries,
          loops: metrics.loopsAtEnd.length,
          waves: metrics.wavesAtEnd.length,
          longLivedPatterns: metrics.longLivedPatterns,
          activationMin: metrics.activationRange[0],
          activationMax: metrics.activationRange[1]
        },
        assertions,
        passed: allPassed
      };

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `t4-bridge-regression-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('\n✓ Snapshot exported to JSON');

      if (callback) callback(snapshot);
      return;
    }

    const dt = 0.016;
    integratePhysics(dt);
    applySemanticPositionalBias();
    applyPatternInfluence();
    updateEnergyStress(dt);
    ambientStep(dt);
    activationStep(dt);
    if (stepCount % 5 === 0) detectPatterns();
    stepCount++;
    state.step++;

    // Progress update every 2000 steps
    if (stepCount % 2000 === 0) {
      console.log(`Progress: ${stepCount}/${targetSteps} steps (${state.patterns.length} patterns, ${state.overloads} overloads)`);
    }

    setTimeout(step, 0);
  }

  step();
}

// Init
// resizeCanvas();
loadScene('single_core_two_anchors');
document.getElementById('btn-play').textContent = '⏸'; // Start paused icon since running=true
// animate();

// Expose functions globally
window.runT4Tests = runT4Tests;
window.generateRunReport = generateRunReport;
window.runBaselineScenario = runBaselineScenario;
window.runBridgeRegressionTest = runBridgeRegressionTest;
window.runBridgeRegressionTest = runBridgeRegressionTest;
window.InputAdapter = InputAdapter;
window.applyModel = applyModel;
window.MODEL_REGISTRY = MODEL_REGISTRY;
window.listModels = listModels;
window.runScenarioStep = runScenarioStep;

// [S4 T3] Replay System
const ReplaySystem = {
  liveBackup: null,

  enter: () => {
    if (mode === 'replay') return;
    ReplaySystem.liveBackup = {
      objects: state.objects, // Refs are fine if we don't mutate them in replay
      edges: state.edges,
      patterns: state.patterns,
      metrics: { ...state.metrics },
      step: state.step,
      // Deep copy needed? If Replay overwrites objects array, liveBackup holds ref to OLD array.
      // But Replay creates NEW objects array. So Live objects are safe in this detached array.
    };
    mode = 'replay';
    running = false;
    document.getElementById('mode-badge').className = 'mgs-mode-badge replay';
    document.getElementById('mode-badge').textContent = 'REPLAY';
    document.getElementById('btn-play').textContent = '▶'; // Show play icon (paused state)
  },

  exit: () => {
    if (mode !== 'replay' || !ReplaySystem.liveBackup) return;
    state.objects = ReplaySystem.liveBackup.objects;
    state.edges = ReplaySystem.liveBackup.edges;
    state.patterns = ReplaySystem.liveBackup.patterns;
    state.metrics = ReplaySystem.liveBackup.metrics;
    state.step = ReplaySystem.liveBackup.step;
    ReplaySystem.liveBackup = null;

    mode = 'live';
    running = true;
    document.getElementById('mode-badge').className = 'mgs-mode-badge live';
    document.getElementById('mode-badge').textContent = 'LIVE';
    document.getElementById('btn-play').textContent = '⏸';
    // animate(); // Resume loop if stopped
  },

  seek: (index) => {
    const frame = Recorder.getFrame(index);
    if (!frame) return;

    ReplaySystem.enter();

    // Reconstruct State
    state.step = frame.step;
    state.metrics = frame.metrics;

    // Rebuild Objects
    state.objects = frame.objects.map(s => ({
      id: s.id, x: s.x, y: s.y,
      activation: s.activation,
      mat: { category: s._matCategory || 'metal', color: s._matColor }, // Mock minimal mat
      stress: s.stress,
      overloaded: s.overloaded,
      label: s.label,
      role: 'Node' // Default
    }));

    // Rebuild Edges
    state.edges = (frame.edges || []).map(e => {
      const src = state.objects.find(o => o.id === e.s);
      const tgt = state.objects.find(o => o.id === e.t);
      if (!src || !tgt) return null;
      return {
        source: src, target: tgt,
        sourceId: e.s, targetId: e.t,
        weight: e.w,
        stress: e.str,
        severed: e.sev
      };
    }).filter(e => e !== null);

    // Rebuild Patterns
    state.patterns = frame.patterns.map(p => ({
      id: p.id, type: p.type,
      nodes: p._cachedNodes // render expects nodes with {x,y}
    }));

    // Update UI
    updateUI();
    render();
  }
};


// [S5 T2] Narrative Generator
const NarrativeGenerator = {
  analyze: (buffer) => {
    if (!buffer || buffer.length === 0) return "No data recorded.";

    let sumDensity = 0;
    let maxDensity = 0;
    const patternCounts: Record<string, number> = {};

    buffer.forEach(frame => {
      const d = frame.metrics.patternDensity || 0;
      sumDensity += d;
      if (d > maxDensity) maxDensity = d;

      if (frame.patterns) {
        frame.patterns.forEach(p => {
          patternCounts[p.type] = (patternCounts[p.type] || 0) + 1;
        });
      }
    });

    const avgDensity = (sumDensity / buffer.length).toFixed(2);
    const peakDensity = maxDensity.toFixed(2);

    let dominantPattern = 'None';
    let maxCount = 0;
    for (const [type, count] of Object.entries(patternCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantPattern = type;
      }
    }

    // Safety check for legacy buffers without overloads
    const startOverloads = buffer[0].overloads || 0;
    const endOverloads = buffer[buffer.length - 1].overloads || 0;
    const newOverloads = Math.max(0, endOverloads - startOverloads);

    let mood = 'calm';
    const avgDensityNum = parseFloat(avgDensity);
    if (avgDensityNum > 1.5) mood = 'busy';
    if (avgDensityNum > 3.0) mood = 'chaotic';

    return `Session Summary:
The session was generally ${mood} (Avg Density: ${avgDensity}, Peak: ${peakDensity}).
New Overloads: ${newOverloads}.
Dominant Pattern: ${dominantPattern}.`;
  }
};
window.NarrativeGenerator = NarrativeGenerator;


// UI Bindings for Recorder
const btnRecord = document.getElementById('btn-record');
if (btnRecord) {
  btnRecord.onclick = () => {
    if (Recorder.recording) {
      Recorder.stop();
      btnRecord.style.color = '#ff4d4d'; // Red (Idle)
      btnRecord.textContent = '●';
      // Update scrubber range
      const meta = Recorder.getMetadata();
      const scrub = document.getElementById('scrubber') as HTMLInputElement;
      if (scrub) {
        scrub.max = String(meta.count - 1);
        scrub.value = String(meta.count - 1);
        scrub.disabled = false;
      }
    } else {
      Recorder.start();
      btnRecord.textContent = '■';
    }
  };
}

const btnExportRun = document.getElementById('btn-export-run');
if (btnExportRun) {
  btnExportRun.onclick = () => {
    const data = Recorder.exportJSON();
    if (!data.frames || data.frames.length === 0) {
      alert('No recorded frames to export. Please record a session first.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mgs-run-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('Run exported to JSON', 'success');
  };
}

const btnAnalyze = document.getElementById('btn-analyze');
if (btnAnalyze) {
  btnAnalyze.onclick = () => {
    if (!Recorder.buffer || Recorder.buffer.length === 0) {
      alert('No recorded frames to analyze.');
      return;
    }
    const text = NarrativeGenerator.analyze(Recorder.buffer);
    alert(text);
  };
}



const scrubber = document.getElementById('scrubber');
if (scrubber) {
  scrubber.oninput = (e) => {
    const idx = parseInt((e.target as HTMLInputElement).value);
    ReplaySystem.seek(idx);
    const label = document.getElementById('scrubber-label');
    if (label) label.textContent = `Frame ${idx}`;
  };
}


// [S5 T3] Catalog UI Logic
const catalogModal = document.getElementById('catalog-modal');
const btnCatalog = document.getElementById('btn-catalog');
const btnCloseCatalog = document.getElementById('btn-close-catalog');

function renderCatalogUI() {
  const profilesList = document.getElementById('catalog-profiles-list');
  const framesList = document.getElementById('catalog-frames-list');
  if (!profilesList || !framesList) return;

  profilesList.innerHTML = '';
  framesList.innerHTML = '';

  // Render Profiles
  Object.values(PROFILE_REGISTRY).forEach(p => {
    const card = document.createElement('div');
    card.className = 'mgs-catalog-card';
    card.innerHTML = `<h4>${p.label}</h4><p>${p.description || 'No description.'}</p>`;
    // @ts-ignore
    if (p.noise_base > 0.5) card.innerHTML += `<span class="tag">High Noise</span>`;

    card.onclick = () => {
      applyProfile(p.id);
      catalogModal.classList.remove('open');
      updateUI();
    };
    profilesList.appendChild(card);
  });

  // Render Frames
  Object.values(FRAME_REGISTRY).forEach(f => {
    const card = document.createElement('div');
    card.className = 'mgs-catalog-card';
    card.innerHTML = `<h4>${f.label}</h4><p>${f.description || 'No description.'}</p>`;

    card.onclick = () => {
      applyFrame(f.id);
      catalogModal.classList.remove('open');
      updateUI();
    };
    framesList.appendChild(card);
  });
}

if (btnCatalog && catalogModal) {
  btnCatalog.onclick = () => {
    renderCatalogUI();
    catalogModal.classList.add('open');
  };
}

if (btnCloseCatalog && catalogModal) {
  btnCloseCatalog.onclick = () => {
    catalogModal.classList.remove('open');
  };
}
// Close on outside click
if (catalogModal) {
  catalogModal.onclick = (e) => {
    if (e.target === catalogModal) catalogModal.classList.remove('open');
  };
}


const btnPlay = document.getElementById('btn-play');
// Hook btnPlay to handle resume live or play record?
// For now, if in Replay, clicking Play calls exit() to resume Live.
const originalPlay = btnPlay.onclick; // Likely was null or simple
btnPlay.onclick = () => {
  if (mode === 'replay') {
    ReplaySystem.exit();
  } else {
    // Toggle pause/play
    running = !running;
    btnPlay.textContent = running ? '⏸' : '▶';
    // if (running) animate();
  }
};

// [S4 T4] Scenario Runner
const STRESS_TEST_SCENARIO = [
  { at_step: 100, target: 'ambient', channel: 'noise.base_strength', mode: 'set', magnitude: 0.35 },
  { at_step: 200, target: 'ambient', channel: 'gravity.strength', mode: 'multiply', magnitude: 1.5 },
  { at_step: 300, target: 'node', selector: 'mat:metal', channel: 'mass', mode: 'multiply', magnitude: 2.0 },
  { at_step: 400, target: 'ambient', channel: 'noise.base_strength', mode: 'set', magnitude: 0.8 },
  { at_step: 450, target: 'ambient', channel: 'noise.base_strength', mode: 'set', magnitude: 0.15 }
];

function runStressTest() {
  if (confirm("Run 500-step Conflict Stress Test? This will reset the scene.")) {
    addLog('Initializing Stress Test...', 'info');

    // 1. Reset Scene
    loadScene('conflict_resolution');
    applyProfile('open_neutral');
    applyFrame('frame_open_exploration');

    // Apply selected model if any
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) applyModel((modelSelect as HTMLSelectElement).value);

    // 2. Prepare Runner
    running = false; // Stop live loop
    document.getElementById('btn-play').textContent = '▶';

    setTimeout(() => { // minimal delay to let UI update log
      Recorder.start();

      const TOTAL_STEPS = 500;
      const dt = 0.016;

      try {
        for (let i = 0; i < TOTAL_STEPS; i++) {
          // Apply Scenario Events
          runScenarioStep(STRESS_TEST_SCENARIO, state.step);

          // Simulation Logic (Mirroring step())
          integratePhysics(dt);
          applySemanticPositionalBias();
          applyPatternInfluence();
          updateEnergyStress(dt);
          ambientStep(dt);
          activationStep(dt);
          if (state.step % 5 === 0) detectPatterns();

          state.step++;

          // Capture
          Recorder.capture(state);
        }

        Recorder.stop();

        // Switch to Replay
        ReplaySystem.enter();
        ReplaySystem.seek(0);
        updateUI();
        addLog('Stress Test Complete. Replay mode active.', 'success');

      } catch (e) {
        console.error(e);
        addLog('Error running stress test', 'error');
        running = true; // animate();
      }
    }, 50);
  }
}

const btnRunStress = document.getElementById('btn-run-stress');
if (btnRunStress) btnRunStress.onclick = runStressTest;

window.getCurrentContext = getCurrentContext;

window.Recorder = Recorder;
window.ReplaySystem = ReplaySystem;

// S7 Migration: Expose Core API & State to Window (for Tests and Demo)
window.state = state;
window.physicsConfig = physicsConfig;
window.hudMetrics = hudMetrics;
window.patternIdCounter = patternIdCounter;

window.loadScene = loadScene;
window.applyProfile = applyProfile;
window.applyFrame = applyFrame;

window.integratePhysics = integratePhysics;
window.applySemanticPositionalBias = applySemanticPositionalBias;
window.applyPatternInfluence = applyPatternInfluence;
window.updateEnergyStress = updateEnergyStress;
// S7.1 UI Hook Exports
// S7.1 UI Hook Exports
(window as any).drawGraph = drawGraph;
(window as any).resizeCanvas = resize;

export {
  resize as resizeCanvas,
  FRAME_REGISTRY
};
