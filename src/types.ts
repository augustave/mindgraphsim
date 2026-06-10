// MindGraphSim v0.7 - Core Types
// Physics-based cognitive simulation for neurodivergent thought

// ============================================
// Vector Types
// ============================================

export interface Vector3 {
  x: number; // conceptual_distance
  y: number; // sensory_intensity
  z: number; // emotional_valence
}

export interface Charge {
  emotional: number;
  social: number;
  sensory: number;
}

export interface SensoryProfile {
  sound: number;
  color: number;
  texture: number;
  temperature: number;
  weight: number;
}

export interface LightCone {
  spatial_reach: number;
  temporal_reach: number;
  cone_type: 'bacterial' | 'human' | 'extended';
}

// ============================================
// Feature Vectors
// ============================================

export interface IntrinsicVector {
  novelty: number;      // N - How new/original
  utility: number;      // U - Practical value
  connectivity: number; // C - Links to other concepts
  stability: number;    // S - Resistance to change
}

export interface ExtendedVector {
  // Implementation
  effort: number;           // Inverted: 1.0 = low effort
  feasibility: number;      // Technical achievability
  // Strategic
  reach: number;            // Users/systems affected (log-scaled)
  strategic_fit: number;    // Alignment with goals
  customer_value: number;   // Benefit to end-user
  // Temporal
  time_to_impact: number;   // Inverted: 1.0 = fast
  extendibility: number;    // Future adaptation potential
  // Risk
  imitability: number;      // 1.0 = hard to copy
}

export interface ExpandedFeatureVector extends IntrinsicVector, ExtendedVector {}

// ============================================
// Materials
// ============================================

export type MaterialCategory = 'metal' | 'mineral' | 'bio';

export type MaterialType =
  // Metals (10)
  | 'gold' | 'iron_metal' | 'nickel' | 'copper' | 'silver'
  | 'titanium' | 'platinum' | 'aluminum' | 'tungsten' | 'chromium'
  // Minerals (10)
  | 'quartz' | 'feldspar' | 'mica' | 'calcite' | 'gypsum'
  | 'hematite' | 'fluorite' | 'apatite' | 'tourmaline' | 'garnet'
  // Bio-elements (11)
  | 'carbon' | 'nitrogen' | 'oxygen' | 'phosphorus' | 'sulfur'
  | 'calcium' | 'magnesium' | 'potassium' | 'sodium' | 'iron_bio'
  | 'mycelium';

// ============================================
// Edges
// ============================================

export type RelationType = 'association' | 'conflict' | 'support' | 'supervision' | 'gate';

// Canonical Edge shape for the modular library (simulation.ts, physics.ts, etc.).
// The legacy engine.ts / lab_view.ts use a parallel camelCase shape (sourceId/targetId)
// and don't share live edge objects with this one. Unify after the Phase 3 god-file split.
export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  weight: number;
  tension: number;
  elasticity: number;
  conductivity: number;
  severed: boolean;
  recovery_progress: number; // 0-1, for healing after overload
}

// ============================================
// Cognitive Objects
// ============================================

export interface CognitiveObject {
  id: string;
  label: string;
  material_type: MaterialType;
  
  // Physics
  mass: number;
  charge: Charge;
  position: Vector3;
  velocity: Vector3;
  
  // Activation
  activation: number;
  decay_rate: number;
  
  // Sensory
  sensory_profile: SensoryProfile;
  
  // Light cone
  light_cone: LightCone;
  
  // Feature vector (12D + confidence)
  feature_vector: ExpandedFeatureVector;
  confidence: number; // Global multiplier
  
  // State
  loop_tags: string[];
  frozen: boolean;
}

// ============================================
// Patterns
// ============================================

export type PatternType = 'loop' | 'cluster' | 'wave' | 'spiral';

export type ClusterArchetype =
  | 'quick_wins'    // High feasibility, low effort, fast TTI
  | 'moonshots'     // High novelty, low feasibility
  | 'workhorses'    // High utility, high stability
  | 'bridges'       // High connectivity across clusters
  | 'shields'       // High stability, low sensory load
  | 'catalysts'     // High volatility, accelerates neighbors
  | 'unknown';

export interface Pattern {
  id: string;
  type: PatternType;
  archetype: ClusterArchetype;
  member_ids: string[];
  signature: number[];
  persistence_score: number;
  self_maintenance_score: number;
  first_detected_step: number;
  last_detected_step: number;
}

export interface PatternAgent extends Pattern {
  vitality: number;      // 0-1, health of the pattern
  hunger: number;        // Need for new members
  territory: string[];   // Objects it's trying to claim
  competing_with: string[]; // Other pattern IDs
}

// ============================================
// Ambient Field
// ============================================

export interface BodyState {
  hunger: number;
  fatigue: number;
  pain: number;
}

export interface AmbientField {
  baseline_arousal: number;
  noise_level: number;
  safety_index: number;
  body_state: BodyState;
  field_bias: Vector3;
}

// ============================================
// Events
// ============================================

export interface OverloadEvent {
  step: number;
  trigger_object_id: string;
  severed_edges: string[];
  local_sensory_load: number;
  ambient_noise: number;
}

export interface RecoveryEvent {
  step: number;
  edge_id: string;
  object_ids: [string, string];
}

// ============================================
// Simulation State
// ============================================

export interface SimulationState {
  objects: Map<string, CognitiveObject>;
  edges: Map<string, Edge>;
  patterns: Map<string, PatternAgent>;
  ambient_field: AmbientField;
  step: number;
  overload_events: OverloadEvent[];
  recovery_events: RecoveryEvent[];
}

// ============================================
// Telemetry
// ============================================

export interface Telemetry {
  step: number;
  total_kinetic_energy: number;
  total_activation: number;
  pattern_count: number;
  overload_count: number;
  recovery_count: number;
  avg_sensory_load: number;
  cluster_archetypes: Record<ClusterArchetype, number>;
}

// ============================================
// Factory Helpers
// ============================================

export function createVector3(x = 0, y = 0, z = 0): Vector3 {
  return { x, y, z };
}

export function createCharge(emotional = 0, social = 0, sensory = 0): Charge {
  return { emotional, social, sensory };
}

export function createSensoryProfile(
  sound = 0.3, color = 0.3, texture = 0.3, temperature = 0.3, weight = 0.3
): SensoryProfile {
  return { sound, color, texture, temperature, weight };
}

export function createExpandedFeatureVector(
  intrinsic: Partial<IntrinsicVector> = {},
  extended: Partial<ExtendedVector> = {}
): ExpandedFeatureVector {
  return {
    novelty: intrinsic.novelty ?? 0.5,
    utility: intrinsic.utility ?? 0.5,
    connectivity: intrinsic.connectivity ?? 0.5,
    stability: intrinsic.stability ?? 0.5,
    effort: extended.effort ?? 0.5,
    feasibility: extended.feasibility ?? 0.5,
    reach: extended.reach ?? 0.5,
    strategic_fit: extended.strategic_fit ?? 0.5,
    customer_value: extended.customer_value ?? 0.5,
    time_to_impact: extended.time_to_impact ?? 0.5,
    extendibility: extended.extendibility ?? 0.5,
    imitability: extended.imitability ?? 0.5,
  };
}

export function createEdge(
  partial: Partial<Edge> & { id: string; source_id: string; target_id: string }
): Edge {
  return {
    id: partial.id,
    source_id: partial.source_id,
    target_id: partial.target_id,
    relation_type: partial.relation_type ?? 'association',
    weight: partial.weight ?? 1,
    tension: partial.tension ?? 0,
    elasticity: partial.elasticity ?? 0.5,
    conductivity: partial.conductivity ?? 0.8,
    severed: partial.severed ?? false,
    recovery_progress: partial.recovery_progress ?? 0,
  };
}
