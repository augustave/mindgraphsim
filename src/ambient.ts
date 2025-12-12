// MindGraphSim - Ambient Field Engine
// Global field evolution, overload detection, and recovery mechanics

import {
  AmbientField,
  SimulationState,
  OverloadEvent,
  RecoveryEvent,
  BodyState,
  Vector3,
} from './types';
import { NeurodivergentProfile } from './profiles';
import { MaterialLibrary } from './materials';

export class AmbientFieldEngine {
  private materials: MaterialLibrary;

  constructor(materials: MaterialLibrary) {
    this.materials = materials;
  }

  createDefault(): AmbientField {
    return {
      baseline_arousal: 0.5,
      noise_level: 0.2,
      safety_index: 0.7,
      body_state: { hunger: 0.3, fatigue: 0.3, pain: 0.1 },
      field_bias: { x: 0, y: 0, z: 0 },
    };
  }

  update(state: SimulationState, profile: NeurodivergentProfile): void {
    const field = state.ambient_field;

    // Update baseline arousal based on body state and safety
    this.updateArousal(field);

    // Check for overload events
    this.checkOverload(state, profile);

    // Process recovery for severed edges
    this.processRecovery(state, profile);

    // Decay noise slightly each step
    field.noise_level *= 0.99;
    field.noise_level = Math.max(0, field.noise_level);
  }

  private updateArousal(field: AmbientField): void {
    const bodyLoad =
      (field.body_state.hunger + field.body_state.fatigue + field.body_state.pain) / 3;

    // Arousal increases with body load, decreases with safety
    field.baseline_arousal = 0.5 + bodyLoad * 0.3 - field.safety_index * 0.2;
    field.baseline_arousal = Math.max(0, Math.min(1, field.baseline_arousal));
  }

  private checkOverload(state: SimulationState, profile: NeurodivergentProfile): void {
    const threshold = profile.sensory_threshold;
    const cutFraction = profile.overload_cut_fraction;
    const amplification = profile.sensory_amplification;

    for (const obj of state.objects.values()) {
      if (obj.frozen) continue;

      const mat = this.materials.get(obj.material_type);

      // Compute local sensory load
      const localLoad =
        (obj.sensory_profile.sound +
          obj.sensory_profile.color +
          obj.sensory_profile.texture +
          obj.sensory_profile.temperature) /
        4;

      // Total load = local + ambient noise, amplified by profile
      const totalLoad = localLoad * amplification + state.ambient_field.noise_level;

      // Check against both profile threshold and material threshold
      const effectiveThreshold = Math.min(threshold, mat.overload_threshold);

      if (totalLoad > effectiveThreshold) {
        // Trigger overload - sever edges
        const connectedEdges = Array.from(state.edges.values()).filter(
          e =>
            (e.source_id === obj.id || e.target_id === obj.id) &&
            !e.severed
        );

        if (connectedEdges.length === 0) continue;

        const toSever = Math.max(1, Math.ceil(connectedEdges.length * cutFraction));
        const severed: string[] = [];

        // Sever weakest edges first (lowest weight)
        connectedEdges
          .sort((a, b) => a.weight - b.weight)
          .slice(0, toSever)
          .forEach(e => {
            e.severed = true;
            e.recovery_progress = 0;
            severed.push(e.id);
          });

        if (severed.length > 0) {
          const event: OverloadEvent = {
            step: state.step,
            trigger_object_id: obj.id,
            severed_edges: severed,
            local_sensory_load: localLoad,
            ambient_noise: state.ambient_field.noise_level,
          };
          state.overload_events.push(event);

          // Reduce activation on overload
          obj.activation *= 0.5;

          // Increase local noise (overload ripples)
          state.ambient_field.noise_level = Math.min(
            1,
            state.ambient_field.noise_level + 0.05
          );
        }
      }
    }
  }

  private processRecovery(state: SimulationState, profile: NeurodivergentProfile): void {
    const halfLife = profile.recovery_half_life;
    const recoveryRate = 0.693 / halfLife; // ln(2) / halfLife

    // Recovery is faster when safety is high and arousal is low
    const safetyBonus = state.ambient_field.safety_index;
    const arousalPenalty = state.ambient_field.baseline_arousal;
    const effectiveRate = recoveryRate * safetyBonus * (1 - arousalPenalty * 0.5);

    for (const edge of state.edges.values()) {
      if (!edge.severed) continue;

      // Progress recovery
      edge.recovery_progress += effectiveRate;

      if (edge.recovery_progress >= 1) {
        // Edge has healed
        edge.severed = false;
        edge.recovery_progress = 0;
        edge.tension = 0; // Reset tension on recovery

        // Log recovery event
        const recoveryEvent: RecoveryEvent = {
          step: state.step,
          edge_id: edge.id,
          object_ids: [edge.source_id, edge.target_id],
        };
        state.recovery_events.push(recoveryEvent);
      }
    }
  }

  // --- External Controls ---

  injectNoise(field: AmbientField, amount: number): void {
    field.noise_level = Math.min(1, field.noise_level + amount);
  }

  reduceNoise(field: AmbientField, amount: number): void {
    field.noise_level = Math.max(0, field.noise_level - amount);
  }

  setBias(field: AmbientField, bias: Partial<Vector3>): void {
    if (bias.x !== undefined) field.field_bias.x = bias.x;
    if (bias.y !== undefined) field.field_bias.y = bias.y;
    if (bias.z !== undefined) field.field_bias.z = bias.z;
  }

  setBodyState(field: AmbientField, state: Partial<BodyState>): void {
    if (state.hunger !== undefined)
      field.body_state.hunger = Math.max(0, Math.min(1, state.hunger));
    if (state.fatigue !== undefined)
      field.body_state.fatigue = Math.max(0, Math.min(1, state.fatigue));
    if (state.pain !== undefined)
      field.body_state.pain = Math.max(0, Math.min(1, state.pain));
  }

  setSafety(field: AmbientField, safety: number): void {
    field.safety_index = Math.max(0, Math.min(1, safety));
  }

  setArousal(field: AmbientField, arousal: number): void {
    field.baseline_arousal = Math.max(0, Math.min(1, arousal));
  }

  // --- Queries ---

  getOverloadRisk(state: SimulationState, profile: NeurodivergentProfile): number {
    let totalRisk = 0;
    let count = 0;

    for (const obj of state.objects.values()) {
      const mat = this.materials.get(obj.material_type);
      const localLoad =
        (obj.sensory_profile.sound +
          obj.sensory_profile.color +
          obj.sensory_profile.texture +
          obj.sensory_profile.temperature) /
        4;
      const totalLoad =
        localLoad * profile.sensory_amplification + state.ambient_field.noise_level;
      const threshold = Math.min(profile.sensory_threshold, mat.overload_threshold);

      totalRisk += totalLoad / threshold;
      count++;
    }

    return count > 0 ? totalRisk / count : 0;
  }

  getRecoveryProgress(state: SimulationState): number {
    const severedEdges = Array.from(state.edges.values()).filter(e => e.severed);
    if (severedEdges.length === 0) return 1;

    const totalProgress = severedEdges.reduce((sum, e) => sum + e.recovery_progress, 0);
    return totalProgress / severedEdges.length;
  }
}
