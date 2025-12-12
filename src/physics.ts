// MindGraphSim - Physics Engine
// Force calculations for cognitive object dynamics

import { CognitiveObject, Edge, Vector3, SimulationState } from './types';
import { NeurodivergentProfile } from './profiles';
import { MaterialLibrary } from './materials';

export interface PhysicsConfig {
  timestep: number;
  gravitation_constant: number;
  repulsion_constant: number;
  spring_constant: number;
  max_velocity: number;
  tension_accumulation_rate: number;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  timestep: 0.05,
  gravitation_constant: 0.5,
  repulsion_constant: 0.3,
  spring_constant: 0.2,
  max_velocity: 10,
  tension_accumulation_rate: 0.01,
};

export class PhysicsEngine {
  private config: PhysicsConfig;
  private materials: MaterialLibrary;

  constructor(materials: MaterialLibrary, config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.materials = materials;
  }

  update(state: SimulationState, profile: NeurodivergentProfile): void {
    const dt = this.config.timestep;
    const objects = Array.from(state.objects.values());

    // Initialize force accumulators
    const forces = new Map<string, Vector3>();
    for (const obj of objects) {
      forces.set(obj.id, { x: 0, y: 0, z: 0 });
    }

    // Compute pairwise forces
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const a = objects[i];
        const b = objects[j];
        if (a.frozen && b.frozen) continue;

        // Gravitation (attraction based on mass and compatibility)
        const grav = this.computeGravitation(a, b, profile);
        
        // Repulsion (from charge conflicts and sensory saturation)
        const rep = this.computeRepulsion(a, b, profile);

        const fa = forces.get(a.id)!;
        const fb = forces.get(b.id)!;

        if (!a.frozen) {
          fa.x += grav.x + rep.x;
          fa.y += grav.y + rep.y;
          fa.z += grav.z + rep.z;
        }
        if (!b.frozen) {
          fb.x -= grav.x + rep.x;
          fb.y -= grav.y + rep.y;
          fb.z -= grav.z + rep.z;
        }
      }
    }

    // Spring forces from edges + tension accumulation
    for (const edge of state.edges.values()) {
      if (edge.severed) continue;

      const a = state.objects.get(edge.source_id);
      const b = state.objects.get(edge.target_id);
      if (!a || !b) continue;

      const spring = this.computeSpringForce(a, b, edge);
      const fa = forces.get(a.id)!;
      const fb = forces.get(b.id)!;

      if (!a.frozen) {
        fa.x += spring.x;
        fa.y += spring.y;
        fa.z += spring.z;
      }
      if (!b.frozen) {
        fb.x -= spring.x;
        fb.y -= spring.y;
        fb.z -= spring.z;
      }

      // Accumulate tension based on displacement
      this.updateEdgeTension(edge, a, b);
    }

    // Field bias from ambient
    const bias = state.ambient_field.field_bias;
    const biasStrength = 1 - state.ambient_field.safety_index; // Less safe = more bias effect
    for (const obj of objects) {
      if (obj.frozen) continue;
      const f = forces.get(obj.id)!;
      f.x += bias.x * obj.activation * biasStrength;
      f.y += bias.y * obj.activation * biasStrength;
      f.z += bias.z * obj.activation * biasStrength;
    }

    // Apply drag (resistance from ambient field and fatigue)
    const baseDrag = profile.drag_coefficient;
    const fatigueDrag = state.ambient_field.body_state.fatigue * 0.5;
    const totalDrag = baseDrag + fatigueDrag;

    for (const obj of objects) {
      if (obj.frozen) continue;
      const f = forces.get(obj.id)!;
      const mat = this.materials.get(obj.material_type);
      const friction = mat.friction;

      f.x -= obj.velocity.x * totalDrag * friction;
      f.y -= obj.velocity.y * totalDrag * friction;
      f.z -= obj.velocity.z * totalDrag * friction;
    }

    // Semi-implicit Euler integration
    for (const obj of objects) {
      if (obj.frozen) continue;

      const f = forces.get(obj.id)!;
      const invMass = 1 / Math.max(0.1, obj.mass);

      // Update velocity
      obj.velocity.x += f.x * invMass * dt;
      obj.velocity.y += f.y * invMass * dt;
      obj.velocity.z += f.z * invMass * dt;

      // Clamp velocity
      const speed = Math.sqrt(
        obj.velocity.x ** 2 + obj.velocity.y ** 2 + obj.velocity.z ** 2
      );
      if (speed > this.config.max_velocity) {
        const scale = this.config.max_velocity / speed;
        obj.velocity.x *= scale;
        obj.velocity.y *= scale;
        obj.velocity.z *= scale;
      }

      // Update position
      obj.position.x += obj.velocity.x * dt;
      obj.position.y += obj.velocity.y * dt;
      obj.position.z += obj.velocity.z * dt;
    }
  }

  private computeGravitation(
    a: CognitiveObject,
    b: CognitiveObject,
    profile: NeurodivergentProfile
  ): Vector3 {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dz = b.position.z - a.position.z;
    const distSq = Math.max(0.1, dx * dx + dy * dy + dz * dz);
    const dist = Math.sqrt(distSq);

    // Material compatibility affects attraction
    const compatibility = this.materials.computeCompatibility(
      a.material_type,
      b.material_type
    );

    // Connectivity from feature vectors also affects attraction
    const connectivityBoost =
      (a.feature_vector.connectivity + b.feature_vector.connectivity) / 2;

    const strength =
      this.config.gravitation_constant *
      profile.gravitation_multiplier *
      a.mass *
      b.mass *
      compatibility *
      connectivityBoost *
      profile.base_connectivity_gain /
      distSq;

    return {
      x: (dx / dist) * strength,
      y: (dy / dist) * strength,
      z: (dz / dist) * strength,
    };
  }

  private computeRepulsion(
    a: CognitiveObject,
    b: CognitiveObject,
    profile: NeurodivergentProfile
  ): Vector3 {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dz = a.position.z - b.position.z;
    const distSq = Math.max(0.1, dx * dx + dy * dy + dz * dz);
    const dist = Math.sqrt(distSq);

    // Charge conflict
    const emotionalConflict = Math.abs(a.charge.emotional - b.charge.emotional);
    const socialConflict = Math.abs(a.charge.social - b.charge.social);
    const sensoryConflict = Math.abs(a.charge.sensory - b.charge.sensory);
    const totalConflict = emotionalConflict + socialConflict + sensoryConflict;

    // Sensory saturation (amplified by profile)
    const aSensory =
      a.sensory_profile.sound +
      a.sensory_profile.color +
      a.sensory_profile.texture +
      a.sensory_profile.temperature;
    const bSensory =
      b.sensory_profile.sound +
      b.sensory_profile.color +
      b.sensory_profile.texture +
      b.sensory_profile.temperature;
    const saturation = (aSensory + bSensory) * profile.sensory_amplification;

    // Stability difference creates repulsion (unstable repels stable)
    const stabilityDiff = Math.abs(
      a.feature_vector.stability - b.feature_vector.stability
    );

    const strength =
      this.config.repulsion_constant *
      profile.repulsion_multiplier *
      (totalConflict + saturation * 0.1 + stabilityDiff * 0.2) /
      distSq;

    return {
      x: (dx / dist) * strength,
      y: (dy / dist) * strength,
      z: (dz / dist) * strength,
    };
  }

  private computeSpringForce(
    a: CognitiveObject,
    b: CognitiveObject,
    edge: Edge
  ): Vector3 {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dz = b.position.z - a.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.01) return { x: 0, y: 0, z: 0 };

    // Rest length based on edge weight (stronger = closer)
    const restLength = 2.0 / Math.max(0.1, edge.weight);
    const displacement = dist - restLength;

    // Spring force + stored tension
    const strength =
      this.config.spring_constant * edge.elasticity * displacement +
      edge.tension * 0.5;

    return {
      x: (dx / dist) * strength,
      y: (dy / dist) * strength,
      z: (dz / dist) * strength,
    };
  }

  private updateEdgeTension(edge: Edge, a: CognitiveObject, b: CognitiveObject): void {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dz = b.position.z - a.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const restLength = 2.0 / Math.max(0.1, edge.weight);
    const stretch = Math.max(0, dist - restLength);

    // Tension accumulates when stretched, decays when relaxed
    if (stretch > 0) {
      edge.tension += stretch * this.config.tension_accumulation_rate;
      edge.tension = Math.min(1, edge.tension); // Cap at 1
    } else {
      edge.tension *= 0.99; // Slow decay
    }
  }

  getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<PhysicsConfig>): void {
    Object.assign(this.config, config);
  }
}
