// MindGraphSim - Simulation Core
// Main orchestration loop

import {
  CognitiveObject,
  Edge,
  SimulationState,
  Telemetry,
  Vector3,
  ClusterArchetype,
  createEdge,
  createExpandedFeatureVector,
  createVector3,
  createCharge,
  createSensoryProfile,
} from './types';
import { NeurodivergentProfile, getProfile } from './profiles';
import { MaterialLibrary, materialLibrary } from './materials';
import { PhysicsEngine } from './physics';
import { AmbientFieldEngine } from './ambient';
import { InteractionProtocols, Intervention } from './protocols';
import { PatternTracker } from './patterns';
import { MethodologyDecider } from './methodology';

export interface SimulationConfig {
  profile_id: string;
  pattern_detection_interval: number;
  max_objects: number;
  max_edges: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  profile_id: 'neurotypical_baseline',
  pattern_detection_interval: 10,
  max_objects: 10000,
  max_edges: 50000,
};

export class SimulationCore {
  private state: SimulationState;
  private config: SimulationConfig;
  private profile: NeurodivergentProfile;
  private materials: MaterialLibrary;
  private physics: PhysicsEngine;
  private ambient: AmbientFieldEngine;
  private protocols: InteractionProtocols;
  private patterns: PatternTracker;
  private methodology: MethodologyDecider;
  private interventionQueue: Intervention[] = [];
  private telemetryHistory: Telemetry[] = [];

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.profile = getProfile(this.config.profile_id);
    this.materials = materialLibrary;
    this.physics = new PhysicsEngine(this.materials);
    this.ambient = new AmbientFieldEngine(this.materials);
    this.protocols = new InteractionProtocols(this.materials);
    this.patterns = new PatternTracker();
    this.methodology = new MethodologyDecider();
    this.state = this.createEmptyState();
  }

  private createEmptyState(): SimulationState {
    return {
      objects: new Map(),
      edges: new Map(),
      patterns: new Map(),
      ambient_field: this.ambient.createDefault(),
      step: 0,
      overload_events: [],
      recovery_events: [],
    };
  }

  // ============================================
  // Object Management
  // ============================================

  addObject(partial: Partial<CognitiveObject> & { id: string }): CognitiveObject {
    if (this.state.objects.size >= this.config.max_objects) {
      console.warn(`Max objects (${this.config.max_objects}) reached`);
      return this.state.objects.values().next().value as CognitiveObject;
    }

    const materialType = partial.material_type ?? 'iron_metal';
    const mat = this.materials.get(materialType);
    const extendedDefaults = this.materials.getDefaultExtendedVector(materialType);

    const obj: CognitiveObject = {
      id: partial.id,
      label: partial.label ?? partial.id,
      material_type: materialType,
      mass: partial.mass ?? mat.scalar_weight,
      charge: partial.charge ?? createCharge(),
      position: partial.position ?? createVector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0
      ),
      velocity: partial.velocity ?? createVector3(),
      activation: partial.activation ?? 0.5,
      decay_rate: partial.decay_rate ?? 0.1,
      sensory_profile: partial.sensory_profile ?? createSensoryProfile(),
      light_cone: partial.light_cone ?? {
        spatial_reach: mat.base_spatial_reach,
        temporal_reach: mat.base_temporal_reach,
        cone_type: mat.cone_type,
      },
      feature_vector: partial.feature_vector ?? createExpandedFeatureVector(
        mat.vector,
        extendedDefaults
      ),
      confidence: partial.confidence ?? 0.8,
      loop_tags: partial.loop_tags ?? [],
      frozen: partial.frozen ?? false,
    };

    this.state.objects.set(obj.id, obj);
    return obj;
  }

  removeObject(id: string): boolean {
    // Remove connected edges
    for (const [edgeId, edge] of this.state.edges) {
      if (edge.source_id === id || edge.target_id === id) {
        this.state.edges.delete(edgeId);
      }
    }

    // Remove from patterns
    for (const pattern of this.state.patterns.values()) {
      pattern.member_ids = pattern.member_ids.filter(mid => mid !== id);
    }

    return this.state.objects.delete(id);
  }

  addEdge(partial: Partial<Edge> & { id: string; source_id: string; target_id: string }): Edge {
    if (this.state.edges.size >= this.config.max_edges) {
      console.warn(`Max edges (${this.config.max_edges}) reached`);
      return this.state.edges.values().next().value as Edge;
    }

    const edge = createEdge(partial);
    this.state.edges.set(edge.id, edge);
    return edge;
  }

  removeEdge(id: string): boolean {
    return this.state.edges.delete(id);
  }

  getObject(id: string): CognitiveObject | undefined {
    return this.state.objects.get(id);
  }

  getEdge(id: string): Edge | undefined {
    return this.state.edges.get(id);
  }

  // ============================================
  // Intervention Queue
  // ============================================

  queueIntervention(intervention: Intervention): void {
    this.interventionQueue.push(intervention);
  }

  // ============================================
  // Main Simulation Loop
  // ============================================

  step(): void {
    // 1. Apply queued interventions
    this.applyInterventions();

    // 2. Physics update (forces, positions, velocities)
    this.physics.update(this.state, this.profile);

    // 3. Ambient field update (overload, recovery)
    this.ambient.update(this.state, this.profile);

    // 4. Activation decay and propagation
    this.updateActivation();

    // 5. Pattern detection (periodic)
    if (this.state.step % this.config.pattern_detection_interval === 0) {
      this.patterns.updatePatternAgents(this.state, this.profile);
    }

    // 6. Log telemetry
    this.logTelemetry();

    this.state.step++;
  }

  run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  private applyInterventions(): void {
    for (const intervention of this.interventionQueue) {
      this.protocols.apply(intervention, this.state);
    }
    this.interventionQueue = [];
  }

  private updateActivation(): void {
    const dt = 0.05;
    const decayBase = this.profile.activation_decay_base;

    // Decay activation
    for (const obj of this.state.objects.values()) {
      if (obj.frozen) continue;
      obj.activation *= Math.exp(-obj.decay_rate * decayBase * dt);
    }

    // Propagate activation along edges
    const deltas = new Map<string, number>();

    for (const edge of this.state.edges.values()) {
      if (edge.severed) continue;

      const src = this.state.objects.get(edge.source_id);
      const tgt = this.state.objects.get(edge.target_id);
      if (!src || !tgt) continue;

      // Check light cone constraint
      const dist = this.distance(src.position, tgt.position);
      if (dist > src.light_cone.spatial_reach) continue;

      const flow = src.activation * edge.conductivity * edge.weight * 0.1;
      deltas.set(tgt.id, (deltas.get(tgt.id) ?? 0) + flow);
    }

    // Apply deltas
    for (const [id, delta] of deltas) {
      const obj = this.state.objects.get(id);
      if (obj && !obj.frozen) {
        obj.activation = Math.min(1, obj.activation + delta);
      }
    }
  }

  private distance(a: Vector3, b: Vector3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  private logTelemetry(): void {
    const objects = Array.from(this.state.objects.values());

    // Kinetic energy
    const totalKE = objects.reduce((sum, o) => {
      const v2 = o.velocity.x ** 2 + o.velocity.y ** 2 + o.velocity.z ** 2;
      return sum + 0.5 * o.mass * v2;
    }, 0);

    // Total activation
    const totalActivation = objects.reduce((sum, o) => sum + o.activation, 0);

    // Average sensory load
    const avgSensory =
      objects.length > 0
        ? objects.reduce((sum, o) => {
          const sp = o.sensory_profile;
          return sum + (sp.sound + sp.color + sp.texture + sp.temperature) / 4;
        }, 0) / objects.length
        : 0;

    // Cluster archetypes count
    const archetypes: Record<ClusterArchetype, number> = {
      quick_wins: 0,
      moonshots: 0,
      workhorses: 0,
      bridges: 0,
      shields: 0,
      catalysts: 0,
      unknown: 0,
    };

    for (const pattern of this.state.patterns.values()) {
      archetypes[pattern.archetype]++;
    }

    const telemetry: Telemetry = {
      step: this.state.step,
      total_kinetic_energy: totalKE,
      total_activation: totalActivation,
      pattern_count: this.state.patterns.size,
      overload_count: this.state.overload_events.length,
      recovery_count: this.state.recovery_events.length,
      avg_sensory_load: avgSensory,
      cluster_archetypes: archetypes,
    };

    this.telemetryHistory.push(telemetry);

    // Limit history size
    if (this.telemetryHistory.length > 10000) {
      this.telemetryHistory.shift();
    }
  }

  // ============================================
  // Profile Management
  // ============================================

  setProfile(profileId: string): void {
    this.profile = getProfile(profileId);
  }

  getProfile(): NeurodivergentProfile {
    return this.profile;
  }

  // ============================================
  // Accessors
  // ============================================

  getState(): SimulationState {
    return this.state;
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  getTelemetry(): Telemetry[] {
    return [...this.telemetryHistory];
  }

  getLatestTelemetry(): Telemetry | undefined {
    return this.telemetryHistory[this.telemetryHistory.length - 1];
  }

  getMaterials(): MaterialLibrary {
    return this.materials;
  }

  getAmbientEngine(): AmbientFieldEngine {
    return this.ambient;
  }

  getPhysicsEngine(): PhysicsEngine {
    return this.physics;
  }

  getProtocols(): InteractionProtocols {
    return this.protocols;
  }

  getPatternTracker(): PatternTracker {
    return this.patterns;
  }

  getMethodology(): MethodologyDecider {
    return this.methodology;
  }

  // ============================================
  // Reset
  // ============================================

  reset(): void {
    this.state = this.createEmptyState();
    this.interventionQueue = [];
    this.telemetryHistory = [];
    this.protocols.clearLog();
  }

  // ============================================
  // Serialization
  // ============================================

  exportState(): string {
    const serializable = {
      objects: Array.from(this.state.objects.entries()),
      edges: Array.from(this.state.edges.entries()),
      patterns: Array.from(this.state.patterns.entries()),
      ambient_field: this.state.ambient_field,
      step: this.state.step,
      overload_events: this.state.overload_events,
      recovery_events: this.state.recovery_events,
      profile_id: this.profile.id,
    };
    return JSON.stringify(serializable, null, 2);
  }

  importState(json: string): void {
    const data = JSON.parse(json);

    this.state = {
      objects: new Map(data.objects),
      edges: new Map(data.edges),
      patterns: new Map(data.patterns),
      ambient_field: data.ambient_field,
      step: data.step,
      overload_events: data.overload_events ?? [],
      recovery_events: data.recovery_events ?? [],
    };

    if (data.profile_id) {
      this.setProfile(data.profile_id);
    }
  }
}
