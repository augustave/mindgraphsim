// ============================================
// MindGraphSim v0.7 - Genesis
// Physics-based cognitive simulation for neurodivergent thought
// ============================================

// Types
export * from './types';

// Profiles
export {
  PROFILES,
  getProfile,
  listProfiles,
  createCustomProfile,
} from './profiles';
export type { NeurodivergentProfile, CognitiveProfile } from './profiles';

// Strategic Postures
export {
  POSTURES,
  getPosture,
  listPostures,
  createCustomPosture,
  blendPostures,
} from './postures';
export type { StrategicPosture, PostureWeights } from './postures';

// Materials
export {
  MaterialLibrary,
  materialLibrary,
} from './materials';
export type { MaterialDefinition } from './materials';

// Physics
export {
  PhysicsEngine,
} from './physics';
export type { PhysicsConfig } from './physics';

// Ambient Field
export {
  AmbientFieldEngine,
} from './ambient';

// Interaction Protocols
export {
  InteractionProtocols,
} from './protocols';
export type {
  Intervention,
  ProtocolLevel,
  ProtocolLogEntry,
} from './protocols';

// Patterns
export {
  PatternTracker,
} from './patterns';

// Methodology Decider
export {
  MethodologyDecider,
} from './methodology';
export type {
  ScoredObject,
  PostureRecommendation,
} from './methodology';

// Reward (RLAIF)
export {
  computeReward,
  computeRewardWithPosture,
  computeSystemReward,
  computeRewardDelta,
  identifyHighPotential,
  analyzeRewardContribution,
} from './reward';
export type {
  RewardResult,
  SystemReward,
} from './reward';

// Theme
export {
  PALETTE,
  TYPOGRAPHY,
  EFFECTS,
  COMPOSITION,
  MATERIAL_VISUALS,
  getObjectVisualState,
  densityToChar,
  activationToChar,
  getPatternColor,
  getHealthColor,
} from './theme';

// Visualization
export {
  VisualizationAdapter,
} from './visualization';
export type {
  RenderableObject,
  RenderableEdge,
  RenderablePattern,
  SceneData,
} from './visualization';

// Simulation Core
export {
  SimulationCore,
} from './simulation';
export type { SimulationConfig } from './simulation';

// ============================================
// Factory Function
// ============================================

import { SimulationCore as SimCore, SimulationConfig } from './simulation';
import { VisualizationAdapter as VizAdapter } from './visualization';

export interface MindGraphSimInstance {
  sim: SimCore;
  viz: VizAdapter;
}

/**
 * Create a new MindGraphSim instance with optional configuration
 */
export function createMindGraphSim(
  config?: Partial<SimulationConfig>
): MindGraphSimInstance {
  const sim = new SimCore(config);
  const viz = new VizAdapter();

  return { sim, viz };
}

// ============================================
// Quick Start Helpers
// ============================================

// ============================================
// Quick Start Helpers
// ============================================

import { listProfiles } from './profiles';

// S2.5: Profile Registry (Physics Presets)
// ADAPTER: Maps the domain profiles (src/profiles.ts) to Engine Physics
export const PROFILE_REGISTRY = listProfiles().map(p => ({
  id: p.id,
  label: p.name, // Map 'name' to 'label'
  description: p.description,
  category: p.category || "neuro_lens", // Default category

  // Map flat physics params to the Engine's nested structure
  physics: {
    noise_scale: p.novelty_gain,          // Approximate mapping
    gravity_scale: p.gravitation_multiplier,
    safety_scale: 1.0,                    // Default or calculate from overload_cut
    activation_gain: p.base_connectivity_gain,
    friction_gain: p.drag_coefficient
  },

  // Legacy metrics fields (Passed through directly)
  sensory_threshold: p.sensory_threshold,
  sensory_amplification: p.sensory_amplification,
  overload_cut_fraction: p.overload_cut_fraction,
  recovery_rate: 1 / p.recovery_half_life, // Convert half-life to rate if needed
  decay: p.activation_decay_base,
  activationVarianceBoost: 0.15 // Default or add to profile interface
}));

// import { CognitiveObject, MaterialType } from './types'; // Unused

/**
 * Create a simple test graph with a few connected objects
 */
export function createTestGraph(sim: SimCore): void {
  // Core idea (gold anchor)
  sim.addObject({
    id: 'core_idea',
    label: 'Core Idea',
    material_type: 'gold',
    activation: 0.9,
    position: { x: 0, y: 0, z: 0 },
  });

  // Supporting concepts
  sim.addObject({
    id: 'detail_1',
    label: 'Detail 1',
    material_type: 'copper',
    activation: 0.6,
    position: { x: 2, y: 1, z: 0 },
  });

  sim.addObject({
    id: 'detail_2',
    label: 'Detail 2',
    material_type: 'iron_metal',
    activation: 0.5,
    position: { x: -2, y: 1, z: 0 },
  });

  sim.addObject({
    id: 'sensory_memory',
    label: 'Sensory Memory',
    material_type: 'mycelium',
    activation: 0.7,
    sensory_profile: { sound: 0.8, color: 0.7, texture: 0.9, temperature: 0.3, weight: 0.5 },
    position: { x: 0, y: -2, z: 0 },
  });

  sim.addObject({
    id: 'abstract_pattern',
    label: 'Abstract Pattern',
    material_type: 'quartz',
    activation: 0.4,
    position: { x: 3, y: -1, z: 0 },
  });

  // Edges
  sim.addEdge({ id: 'e1', source_id: 'core_idea', target_id: 'detail_1', relation_type: 'support' });
  sim.addEdge({ id: 'e2', source_id: 'core_idea', target_id: 'detail_2', relation_type: 'support' });
  sim.addEdge({ id: 'e3', source_id: 'sensory_memory', target_id: 'core_idea', relation_type: 'association' });
  sim.addEdge({ id: 'e4', source_id: 'detail_1', target_id: 'abstract_pattern', relation_type: 'association' });
  sim.addEdge({ id: 'e5', source_id: 'detail_2', target_id: 'sensory_memory', relation_type: 'association' });
}

/**
 * Run a quick simulation demo
 */
export function runDemo(steps: number = 100): {
  sim: SimCore;
  viz: VizAdapter;
  finalTelemetry: import('./types').Telemetry | undefined;
} {
  const { sim, viz } = createMindGraphSim({
    profile_id: 'autistic_intense_connectivity',
  });

  createTestGraph(sim);

  // Inject some ambient noise
  sim.getAmbientEngine().injectNoise(sim.getState().ambient_field, 0.3);

  // Run simulation
  sim.run(steps);

  return {
    sim,
    viz,
    finalTelemetry: sim.getLatestTelemetry(),
  };
}
