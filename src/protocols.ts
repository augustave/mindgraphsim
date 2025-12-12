// MindGraphSim - Interaction Protocols
// wrench, reward, and conversation level interventions

import {
  SimulationState,
  CognitiveObject,
  Edge,
  Vector3,
  MaterialType,
  ExpandedFeatureVector,
} from './types';
import { MaterialLibrary } from './materials';

export type ProtocolLevel = 'wrench' | 'reward' | 'conversation';

export interface Intervention {
  id: string;
  level: ProtocolLevel;
  target_object_ids?: string[];
  target_edge_ids?: string[];
  parameters: Record<string, unknown>;
  applied_at_step?: number;
}

export interface ProtocolLogEntry {
  intervention: Intervention;
  effects: string[];
  timestamp: number;
}

export class InteractionProtocols {
  private materials: MaterialLibrary;
  private log: ProtocolLogEntry[] = [];

  constructor(materials: MaterialLibrary) {
    this.materials = materials;
  }

  apply(intervention: Intervention, state: SimulationState): string[] {
    const effects: string[] = [];

    switch (intervention.level) {
      case 'wrench':
        effects.push(...this.applyWrench(intervention, state));
        break;
      case 'reward':
        effects.push(...this.applyReward(intervention, state));
        break;
      case 'conversation':
        effects.push(...this.applyConversation(intervention, state));
        break;
    }

    intervention.applied_at_step = state.step;

    this.log.push({
      intervention,
      effects,
      timestamp: Date.now(),
    });

    return effects;
  }

  // ============================================
  // WRENCH LEVEL - Direct structural edits
  // "Like surgery on the graph"
  // ============================================

  private applyWrench(intervention: Intervention, state: SimulationState): string[] {
    const effects: string[] = [];
    const params = intervention.parameters;

    // Position changes
    if (params.position_delta) {
      const delta = params.position_delta as Partial<Vector3>;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        if (delta.x !== undefined) obj.position.x += delta.x;
        if (delta.y !== undefined) obj.position.y += delta.y;
        if (delta.z !== undefined) obj.position.z += delta.z;

        effects.push(`Moved ${id} by (${delta.x ?? 0}, ${delta.y ?? 0}, ${delta.z ?? 0})`);
      }
    }

    // Mass changes
    if (params.mass_delta !== undefined) {
      const delta = params.mass_delta as number;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        obj.mass = Math.max(0.1, obj.mass + delta);
        effects.push(`Changed mass of ${id} by ${delta}`);
      }
    }

    // Material change
    if (params.new_material) {
      const newMat = params.new_material as MaterialType;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        const oldMat = obj.material_type;
        obj.material_type = newMat;

        // Update intrinsic vector from new material
        const matDef = this.materials.get(newMat);
        obj.feature_vector.novelty = matDef.vector.novelty;
        obj.feature_vector.utility = matDef.vector.utility;
        obj.feature_vector.connectivity = matDef.vector.connectivity;
        obj.feature_vector.stability = matDef.vector.stability;

        // Update light cone
        obj.light_cone.cone_type = matDef.cone_type;
        obj.light_cone.spatial_reach = matDef.base_spatial_reach;
        obj.light_cone.temporal_reach = matDef.base_temporal_reach;

        effects.push(`Changed material of ${id} from ${oldMat} to ${newMat}`);
      }
    }

    // Edge weight changes
    if (params.weight_delta !== undefined) {
      const delta = params.weight_delta as number;
      for (const id of intervention.target_edge_ids ?? []) {
        const edge = state.edges.get(id);
        if (!edge) continue;

        edge.weight = Math.max(0, edge.weight + delta);
        effects.push(`Changed weight of edge ${id} by ${delta}`);
      }
    }

    // Sever edges
    if (params.sever_edges) {
      for (const id of intervention.target_edge_ids ?? []) {
        const edge = state.edges.get(id);
        if (!edge) continue;

        edge.severed = true;
        edge.recovery_progress = 0;
        effects.push(`Severed edge ${id}`);
      }
    }

    // Reconnect edges
    if (params.reconnect_edges) {
      for (const id of intervention.target_edge_ids ?? []) {
        const edge = state.edges.get(id);
        if (!edge) continue;

        edge.severed = false;
        edge.recovery_progress = 0;
        edge.tension = 0;
        effects.push(`Reconnected edge ${id}`);
      }
    }

    // Freeze/unfreeze
    if (params.freeze !== undefined) {
      const freeze = params.freeze as boolean;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        obj.frozen = freeze;
        if (freeze) {
          obj.velocity = { x: 0, y: 0, z: 0 };
        }
        effects.push(`${freeze ? 'Froze' : 'Unfroze'} ${id}`);
      }
    }

    return effects;
  }

  // ============================================
  // REWARD LEVEL - Adjust local reward/pain fields
  // "So that certain transitions become more likely"
  // ============================================

  private applyReward(intervention: Intervention, state: SimulationState): string[] {
    const effects: string[] = [];
    const params = intervention.parameters;

    // Activation boost/penalty
    if (params.activation_delta !== undefined) {
      const delta = params.activation_delta as number;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        obj.activation = Math.max(0, Math.min(1, obj.activation + delta));
        effects.push(`Changed activation of ${id} by ${delta}`);
      }
    }

    // Sensory profile adjustment
    if (params.sensory_delta) {
      const delta = params.sensory_delta as Partial<CognitiveObject['sensory_profile']>;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        if (delta.sound !== undefined)
          obj.sensory_profile.sound = Math.max(0, Math.min(1, obj.sensory_profile.sound + delta.sound));
        if (delta.color !== undefined)
          obj.sensory_profile.color = Math.max(0, Math.min(1, obj.sensory_profile.color + delta.color));
        if (delta.texture !== undefined)
          obj.sensory_profile.texture = Math.max(0, Math.min(1, obj.sensory_profile.texture + delta.texture));
        if (delta.temperature !== undefined)
          obj.sensory_profile.temperature = Math.max(0, Math.min(1, obj.sensory_profile.temperature + delta.temperature));

        effects.push(`Adjusted sensory profile of ${id}`);
      }
    }

    // Charge adjustment
    if (params.charge_delta) {
      const delta = params.charge_delta as Partial<CognitiveObject['charge']>;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        if (delta.emotional !== undefined) obj.charge.emotional += delta.emotional;
        if (delta.social !== undefined) obj.charge.social += delta.social;
        if (delta.sensory !== undefined) obj.charge.sensory += delta.sensory;

        effects.push(`Adjusted charge of ${id}`);
      }
    }

    // Edge conductivity adjustment (affects activation flow)
    if (params.conductivity_delta !== undefined) {
      const delta = params.conductivity_delta as number;
      for (const id of intervention.target_edge_ids ?? []) {
        const edge = state.edges.get(id);
        if (!edge) continue;

        edge.conductivity = Math.max(0, Math.min(1, edge.conductivity + delta));
        effects.push(`Changed conductivity of edge ${id} by ${delta}`);
      }
    }

    // Ambient field adjustments
    if (params.noise_delta !== undefined) {
      const delta = params.noise_delta as number;
      state.ambient_field.noise_level = Math.max(
        0,
        Math.min(1, state.ambient_field.noise_level + delta)
      );
      effects.push(`Changed ambient noise by ${delta}`);
    }

    if (params.safety_delta !== undefined) {
      const delta = params.safety_delta as number;
      state.ambient_field.safety_index = Math.max(
        0,
        Math.min(1, state.ambient_field.safety_index + delta)
      );
      effects.push(`Changed safety index by ${delta}`);
    }

    return effects;
  }

  // ============================================
  // CONVERSATION LEVEL - High-level prompts
  // "Introduce new objects or rewrite patterns"
  // ============================================

  private applyConversation(intervention: Intervention, state: SimulationState): string[] {
    const effects: string[] = [];
    const params = intervention.parameters;

    // Feature vector adjustment (goals, values)
    if (params.feature_delta) {
      const delta = params.feature_delta as Partial<ExpandedFeatureVector>;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        const keys = Object.keys(delta) as (keyof ExpandedFeatureVector)[];
        for (const key of keys) {
          if (delta[key] !== undefined) {
            obj.feature_vector[key] = Math.max(
              0,
              Math.min(1, obj.feature_vector[key] + (delta[key] as number))
            );
          }
        }

        effects.push(`Shifted feature vector of ${id}`);
      }
    }

    // Light cone adjustment (expand/contract awareness)
    if (params.cone_delta) {
      const delta = params.cone_delta as Partial<CognitiveObject['light_cone']>;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        if (delta.spatial_reach !== undefined)
          obj.light_cone.spatial_reach = Math.max(1, obj.light_cone.spatial_reach + delta.spatial_reach);
        if (delta.temporal_reach !== undefined)
          obj.light_cone.temporal_reach = Math.max(1, obj.light_cone.temporal_reach + delta.temporal_reach);
        if (delta.cone_type !== undefined)
          obj.light_cone.cone_type = delta.cone_type;

        effects.push(`Adjusted light cone of ${id}`);
      }
    }

    // Confidence adjustment
    if (params.confidence_delta !== undefined) {
      const delta = params.confidence_delta as number;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        obj.confidence = Math.max(0, Math.min(1, obj.confidence + delta));
        effects.push(`Changed confidence of ${id} by ${delta}`);
      }
    }

    // Loop tag management
    if (params.add_loop_tags) {
      const tags = params.add_loop_tags as string[];
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        for (const tag of tags) {
          if (!obj.loop_tags.includes(tag)) {
            obj.loop_tags.push(tag);
          }
        }
        effects.push(`Added loop tags to ${id}: ${tags.join(', ')}`);
      }
    }

    if (params.remove_loop_tags) {
      const tags = params.remove_loop_tags as string[];
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        obj.loop_tags = obj.loop_tags.filter(t => !tags.includes(t));
        effects.push(`Removed loop tags from ${id}: ${tags.join(', ')}`);
      }
    }

    // Label change (reframing)
    if (params.new_label) {
      const newLabel = params.new_label as string;
      for (const id of intervention.target_object_ids ?? []) {
        const obj = state.objects.get(id);
        if (!obj) continue;

        const oldLabel = obj.label;
        obj.label = newLabel;
        effects.push(`Relabeled ${id} from "${oldLabel}" to "${newLabel}"`);
      }
    }

    return effects;
  }

  // ============================================
  // Utilities
  // ============================================

  getLog(): ProtocolLogEntry[] {
    return [...this.log];
  }

  clearLog(): void {
    this.log = [];
  }

  getLogByLevel(level: ProtocolLevel): ProtocolLogEntry[] {
    return this.log.filter(entry => entry.intervention.level === level);
  }
}
