// ============================================
// MindGraphSim v0.7 - Genesis
// Physics-based cognitive simulation for neurodivergent thought
// ============================================

// Types
export * from './types';

// Profiles
export {
  NeurodivergentProfile,
  PROFILES,
  getProfile,
  listProfiles,
  createCustomProfile,
} from './profiles';

// Strategic Postures
export {
  StrategicPosture,
  PostureWeights,
  POSTURES,
  getPosture,
  listPostures,
  createCustomPosture,
  blendPostures,
} from './postures';

// Materials
export {
  MaterialLibrary,
  MaterialDefinition,
  materialLibrary,
} from './materials';

// Physics
export {
  PhysicsEngine,
  PhysicsConfig,
} from './physics';

// Ambient Field
export {
  AmbientFieldEngine,
} from './ambient';

// Interaction Protocols
export {
  InteractionProtocols,
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
  RenderableObject,
  RenderableEdge,
  RenderablePattern,
  SceneData,
} from './visualization';

// Simulation Core
export {
  SimulationCore,
  SimulationConfig,
} from './simulation';

// ============================================
// Factory Function
// ============================================

import { SimulationCore, SimulationConfig } from './simulation';
import { VisualizationAdapter } from './visualization';

export interface MindGraphSimInstance {
  sim: SimulationCore;
  viz: VisualizationAdapter;
}

/**
 * Create a new MindGraphSim instance with optional configuration
 */
export function createMindGraphSim(
  config?: Partial<SimulationConfig>
): MindGraphSimInstance {
  const sim = new SimulationCore(config);
  const viz = new VisualizationAdapter();

  return { sim, viz };
}

// ============================================
// Quick Start Helpers
// ============================================

import { CognitiveObject, MaterialType } from './types';

/**
 * Create a simple test graph with a few connected objects
 */
export function createTestGraph(sim: SimulationCore): void {
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
  sim: SimulationCore;
  viz: VisualizationAdapter;
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
