// MindGraphSim - Pattern Tracker
// Loop detection, cluster detection, and pattern agents

import {
  SimulationState,
  CognitiveObject,
  PatternAgent,
  ClusterArchetype,
  ExpandedFeatureVector,
} from './types';
import { NeurodivergentProfile } from './profiles';

export class PatternTracker {
  private knownPatterns: Map<string, PatternAgent> = new Map();

  constructor() { }

  // ============================================
  // Main Detection
  // ============================================

  scan(state: SimulationState, profile: NeurodivergentProfile): PatternAgent[] {
    const detected: PatternAgent[] = [];

    // Detect loops (cycles in the graph)
    detected.push(...this.detectLoops(state, profile));

    // Detect clusters (proximity-based groupings)
    detected.push(...this.detectClusters(state, profile));

    // Detect waves (propagating activation fronts)
    detected.push(...this.detectWaves(state));

    return detected;
  }

  // ============================================
  // Loop Detection (DFS cycle finding)
  // ============================================

  private detectLoops(state: SimulationState, profile: NeurodivergentProfile): PatternAgent[] {
    const loops: PatternAgent[] = [];
    const globalVisited = new Set<string>();
    const sensitivity = profile.loop_detection_sensitivity;

    for (const startId of state.objects.keys()) {
      if (globalVisited.has(startId)) continue;

      const cycles = this.findCycles(startId, state);

      for (const cycle of cycles) {
        if (cycle.length < 3) continue;

        // Filter by activation threshold (sensitivity)
        const avgActivation = this.computeAvgActivation(cycle, state);
        if (avgActivation < 0.3 / sensitivity) continue;

        const id = `loop_${this.hashCycle(cycle)}`;
        const archetype = this.classifyCluster(cycle, state);
        const signature = this.computeSignature(cycle, state);

        loops.push({
          id,
          type: 'loop',
          archetype,
          member_ids: cycle,
          signature,
          persistence_score: 0.1,
          self_maintenance_score: this.computeSelfMaintenance(cycle, state),
          first_detected_step: state.step,
          last_detected_step: state.step,
          vitality: avgActivation,
          hunger: 1 - avgActivation,
          territory: [],
          competing_with: [],
        });

        cycle.forEach(id => globalVisited.add(id));
      }
    }

    return loops;
  }

  private findCycles(startId: string, state: SimulationState): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string, path: string[], depth: number): void => {
      if (depth > 20) return; // Limit depth

      if (stack.has(nodeId)) {
        // Found cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart >= 0) {
          const cycle = path.slice(cycleStart);
          if (cycle.length >= 3) {
            cycles.push(cycle);
          }
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      stack.add(nodeId);
      path.push(nodeId);

      // Follow outgoing edges
      for (const edge of state.edges.values()) {
        if (edge.severed) continue;
        if (edge.source_id === nodeId) {
          dfs(edge.target_id, [...path], depth + 1);
        }
      }

      stack.delete(nodeId);
    };

    dfs(startId, [], 0);
    return cycles;
  }

  // ============================================
  // Cluster Detection (proximity-based)
  // ============================================

  private detectClusters(state: SimulationState, profile: NeurodivergentProfile): PatternAgent[] {
    const clusters: PatternAgent[] = [];
    const visited = new Set<string>();
    const connectivityGain = profile.base_connectivity_gain;

    for (const obj of state.objects.values()) {
      if (visited.has(obj.id)) continue;

      const cluster = this.growCluster(obj, state, visited, connectivityGain);

      if (cluster.length >= 3) {
        const id = `cluster_${state.step}_${cluster[0]}`;
        const archetype = this.classifyCluster(cluster, state);
        const signature = this.computeSignature(cluster, state);
        const avgActivation = this.computeAvgActivation(cluster, state);

        clusters.push({
          id,
          type: 'cluster',
          archetype,
          member_ids: cluster,
          signature,
          persistence_score: 0.1,
          self_maintenance_score: this.computeSelfMaintenance(cluster, state),
          first_detected_step: state.step,
          last_detected_step: state.step,
          vitality: avgActivation,
          hunger: 0.5,
          territory: [],
          competing_with: [],
        });
      }
    }

    return clusters;
  }

  private growCluster(
    start: CognitiveObject,
    state: SimulationState,
    visited: Set<string>,
    connectivityGain: number
  ): string[] {
    const cluster: string[] = [];
    const queue = [start];
    const threshold = start.light_cone.spatial_reach * connectivityGain;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      cluster.push(current.id);

      // Find nearby objects within light cone
      for (const other of state.objects.values()) {
        if (visited.has(other.id)) continue;

        const dist = this.distance(current.position, other.position);
        if (dist < threshold) {
          queue.push(other);
        }
      }
    }

    return cluster;
  }

  // ============================================
  // Wave Detection (activation gradients)
  // ============================================

  private detectWaves(state: SimulationState): PatternAgent[] {
    const waves: PatternAgent[] = [];

    // Find objects with high activation
    const active = Array.from(state.objects.values())
      .filter(o => o.activation > 0.5)
      .sort((a, b) => a.position.x - b.position.x);

    if (active.length < 4) return waves;

    // Look for monotonic activation gradient
    let waveMembers: string[] = [active[0].id];
    let prevActivation = active[0].activation;

    for (let i = 1; i < active.length; i++) {
      const diff = Math.abs(active[i].activation - prevActivation);
      if (diff < 0.2) {
        waveMembers.push(active[i].id);
        prevActivation = active[i].activation;
      } else if (waveMembers.length >= 4) {
        // Save wave
        const signature = this.computeSignature(waveMembers, state);
        waves.push({
          id: `wave_${state.step}_${waveMembers[0]}`,
          type: 'wave',
          archetype: 'catalysts',
          member_ids: [...waveMembers],
          signature,
          persistence_score: 0.1,
          self_maintenance_score: 0.3,
          first_detected_step: state.step,
          last_detected_step: state.step,
          vitality: 0.7,
          hunger: 0.3,
          territory: [],
          competing_with: [],
        });
        waveMembers = [active[i].id];
        prevActivation = active[i].activation;
      } else {
        waveMembers = [active[i].id];
        prevActivation = active[i].activation;
      }
    }

    return waves;
  }

  // ============================================
  // Cluster Classification
  // ============================================

  classifyCluster(memberIds: string[], state: SimulationState): ClusterArchetype {
    const avgFV = this.computeAvgFeatureVector(memberIds, state);

    // Quick Wins: high feasibility, low effort, fast TTI
    if (avgFV.effort > 0.7 && avgFV.feasibility > 0.7 && avgFV.time_to_impact > 0.7) {
      return 'quick_wins';
    }

    // Moonshots: high novelty, low feasibility
    if (avgFV.novelty > 0.7 && avgFV.feasibility < 0.4) {
      return 'moonshots';
    }

    // Workhorses: high utility, high stability
    if (avgFV.utility > 0.8 && avgFV.stability > 0.8) {
      return 'workhorses';
    }

    // Bridges: high connectivity
    if (avgFV.connectivity > 0.85) {
      return 'bridges';
    }

    // Shields: high stability, low sensory load (check members)
    const avgSensory = this.computeAvgSensoryLoad(memberIds, state);
    if (avgFV.stability > 0.8 && avgSensory < 0.4) {
      return 'shields';
    }

    // Catalysts: high extendibility, moderate volatility
    if (avgFV.extendibility > 0.7) {
      return 'catalysts';
    }

    return 'unknown';
  }

  // ============================================
  // Pattern Agent Behaviors
  // ============================================

  updatePatternAgents(state: SimulationState, profile: NeurodivergentProfile): void {
    const detected = this.scan(state, profile);

    // Update existing patterns or add new ones
    for (const pattern of detected) {
      const existing = state.patterns.get(pattern.id);

      if (existing) {
        // Update existing
        existing.last_detected_step = state.step;
        existing.persistence_score = Math.min(
          1,
          existing.persistence_score + 0.05 * profile.pattern_persistence_bonus
        );
        existing.vitality = pattern.vitality;
        existing.self_maintenance_score = pattern.self_maintenance_score;
      } else {
        // Add new
        state.patterns.set(pattern.id, pattern);
      }
    }

    // Decay patterns not detected this step
    const detectedIds = new Set(detected.map(p => p.id));
    for (const [id, pattern] of state.patterns) {
      if (!detectedIds.has(id)) {
        pattern.persistence_score *= 0.9;
        pattern.vitality *= 0.95;

        // Remove if decayed below threshold
        if (pattern.persistence_score < 0.01) {
          state.patterns.delete(id);
        }
      }
    }

    // Pattern competition
    this.resolveCompetition(state);
  }

  private resolveCompetition(state: SimulationState): void {
    const patterns = Array.from(state.patterns.values());

    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const a = patterns[i];
        const b = patterns[j];

        // Check for overlap
        const overlap = a.member_ids.filter(id => b.member_ids.includes(id));
        if (overlap.length === 0) continue;

        // Record competition
        if (!a.competing_with.includes(b.id)) a.competing_with.push(b.id);
        if (!b.competing_with.includes(a.id)) b.competing_with.push(a.id);

        // Stronger pattern claims territory
        if (a.vitality > b.vitality) {
          a.territory.push(...overlap.filter(id => !a.territory.includes(id)));
          b.vitality *= 0.9;
        } else {
          b.territory.push(...overlap.filter(id => !b.territory.includes(id)));
          a.vitality *= 0.9;
        }
      }
    }
  }

  // ============================================
  // Helpers
  // ============================================

  private distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  private hashCycle(cycle: string[]): string {
    const sorted = [...cycle].sort();
    return sorted.join('_').slice(0, 32);
  }

  private computeSignature(memberIds: string[], state: SimulationState): number[] {
    const avgFV = this.computeAvgFeatureVector(memberIds, state);
    return [
      avgFV.novelty,
      avgFV.utility,
      avgFV.connectivity,
      avgFV.stability,
      memberIds.length,
    ];
  }

  private computeAvgActivation(memberIds: string[], state: SimulationState): number {
    let sum = 0;
    let count = 0;
    for (const id of memberIds) {
      const obj = state.objects.get(id);
      if (obj) {
        sum += obj.activation;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  private computeAvgFeatureVector(memberIds: string[], state: SimulationState): ExpandedFeatureVector {
    const result: ExpandedFeatureVector = {
      novelty: 0, utility: 0, connectivity: 0, stability: 0,
      effort: 0, feasibility: 0, reach: 0, strategic_fit: 0,
      customer_value: 0, time_to_impact: 0, extendibility: 0, imitability: 0,
    };

    let count = 0;
    for (const id of memberIds) {
      const obj = state.objects.get(id);
      if (!obj) continue;
      count++;
      for (const key of Object.keys(result) as (keyof ExpandedFeatureVector)[]) {
        result[key] += obj.feature_vector[key];
      }
    }

    if (count > 0) {
      for (const key of Object.keys(result) as (keyof ExpandedFeatureVector)[]) {
        result[key] /= count;
      }
    }

    return result;
  }

  private computeAvgSensoryLoad(memberIds: string[], state: SimulationState): number {
    let sum = 0;
    let count = 0;
    for (const id of memberIds) {
      const obj = state.objects.get(id);
      if (!obj) continue;
      const load = (obj.sensory_profile.sound + obj.sensory_profile.color +
        obj.sensory_profile.texture + obj.sensory_profile.temperature) / 4;
      sum += load;
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  private computeSelfMaintenance(memberIds: string[], state: SimulationState): number {
    let outgoingCount = 0;
    const memberSet = new Set(memberIds);

    for (const edge of state.edges.values()) {
      if (edge.severed) continue;
      if (memberSet.has(edge.source_id) && !memberSet.has(edge.target_id)) {
        outgoingCount++;
      }
    }

    return Math.min(1, outgoingCount / 10);
  }

  // ============================================
  // Queries
  // ============================================

  getAgentPatterns(state: SimulationState): PatternAgent[] {
    return Array.from(state.patterns.values()).filter(
      p => p.persistence_score > 0.5 && p.self_maintenance_score > 0.3
    );
  }

  getPatternsByArchetype(state: SimulationState, archetype: ClusterArchetype): PatternAgent[] {
    return Array.from(state.patterns.values()).filter(p => p.archetype === archetype);
  }

  getDiversity(): number {
    return this.knownPatterns.size;
  }
}
