// MindGraphSim - Cognitive Profiles
// Parameter presets that shape simulation dynamics

export interface CognitiveProfile {
  id: string;
  name: string;
  category?: string;
  description: string;

  // Connectivity
  base_connectivity_gain: number;

  // Sensory
  sensory_threshold: number;
  sensory_amplification: number;

  // Overload
  overload_cut_fraction: number;
  recovery_half_life: number;

  // Focus
  novelty_gain: number;
  drag_coefficient: number;
  activation_decay_base: number;
  anchor_required_mass: number;

  // Physics modifiers
  gravitation_multiplier: number;
  repulsion_multiplier: number;
  safety_multiplier: number;

  // Pattern behavior
  pattern_persistence_bonus: number;
  loop_detection_sensitivity: number;
}

export const PROFILES: Record<string, CognitiveProfile> = {
  open_neutral: {
    id: 'open_neutral',
    name: 'Open Field',
    category: 'open',
    description: 'Balanced profile; keeps parameters neutral so any cognitive style can be explored.',
    base_connectivity_gain: 1.0,
    sensory_threshold: 0.8,
    sensory_amplification: 1.0,
    overload_cut_fraction: 0.2,
    recovery_half_life: 10.0,
    novelty_gain: 1.0,
    drag_coefficient: 1.0,
    activation_decay_base: 1.0,
    anchor_required_mass: 0.5,
    gravitation_multiplier: 1.0,
    repulsion_multiplier: 1.0,
    safety_multiplier: 1.0,
    pattern_persistence_bonus: 1.0,
    loop_detection_sensitivity: 1.0,
  },

  autistic_sensory_sheet: {
    id: 'autistic_sensory_sheet',
    name: 'Sensory Sheet Lens',
    category: 'neuro_lens',
    description: 'Stronger coupling between sensory channels and activation; good for modeling sensory fields.',
    base_connectivity_gain: 1.4,
    sensory_threshold: 0.5,
    sensory_amplification: 1.8,
    overload_cut_fraction: 0.4,
    recovery_half_life: 35.0,
    novelty_gain: 1.1,
    drag_coefficient: 1.05,
    activation_decay_base: 0.7,
    anchor_required_mass: 0.4,
    gravitation_multiplier: 1.1,
    repulsion_multiplier: 1.5,
    safety_multiplier: 1.2,
    pattern_persistence_bonus: 1.2,
    loop_detection_sensitivity: 1.2,
  },

  autistic_intensity: {
    id: 'autistic_intensity',
    name: 'Autistic Intensity',
    category: 'neuro_lens',
    description: 'High sensory gain, tight local connectivity, strong pattern persistence',
    base_connectivity_gain: 1.2, // Reduced from 1.5 (prevents energy explosion)
    sensory_threshold: 0.5,
    sensory_amplification: 1.8,
    overload_cut_fraction: 0.4,
    recovery_half_life: 30.0,
    novelty_gain: 0.8,
    drag_coefficient: 0.4,       // Increased from 0.3 (adds stability)
    activation_decay_base: 0.8,  // Increased from 0.7 (helps clear signal noise)
    anchor_required_mass: 0.4,
    gravitation_multiplier: 1.3,
    repulsion_multiplier: 1.5,
    safety_multiplier: 0.8,
    pattern_persistence_bonus: 1.5,
    loop_detection_sensitivity: 1.4,
  },

  adhd_scatter_focus: {
    id: 'adhd_scatter_focus',
    name: 'ADHD Scatter-Focus',
    category: 'neuro_lens',
    description: 'Fast switching, wide but shallow reach, periodic hyperfocus wells',
    base_connectivity_gain: 1.2,
    sensory_threshold: 0.7,
    sensory_amplification: 1.3,
    overload_cut_fraction: 0.15,
    recovery_half_life: 5.0,
    novelty_gain: 1.7,
    drag_coefficient: 0.2,
    activation_decay_base: 1.8,
    anchor_required_mass: 0.85,
    gravitation_multiplier: 0.7,
    repulsion_multiplier: 0.8,
    safety_multiplier: 0.9,
    pattern_persistence_bonus: 0.6,
    loop_detection_sensitivity: 0.8,
  },

  meditative_slow_field: {
    id: 'meditative_slow_field',
    name: 'Meditative Slow Field',
    category: 'neuro_lens',
    description: 'Low noise, slow drift, wide and gentle attractors',
    base_connectivity_gain: 0.8,
    sensory_threshold: 0.9,
    sensory_amplification: 0.6,
    overload_cut_fraction: 0.1,
    recovery_half_life: 5.0,
    novelty_gain: 0.4,
    drag_coefficient: 0.8,
    activation_decay_base: 0.5,
    anchor_required_mass: 0.3,
    gravitation_multiplier: 1.4,
    repulsion_multiplier: 0.5,
    safety_multiplier: 1.3,
    pattern_persistence_bonus: 1.8,
    loop_detection_sensitivity: 0.6,
  },
};

export function getProfile(id: string): CognitiveProfile {
  // Aliases for compatibility
  if (id === 'general_mind') id = 'open_neutral';
  return PROFILES[id] ?? PROFILES.open_neutral;
}

export function listProfiles(): CognitiveProfile[] {
  return Object.values(PROFILES);
}

export function createCustomProfile(
  base: string,
  overrides: Partial<CognitiveProfile>
): CognitiveProfile {
  const baseProfile = getProfile(base);
  return {
    ...baseProfile,
    ...overrides,
    id: overrides.id ?? `custom_${Date.now()}`,
    name: overrides.name ?? `Custom (based on ${baseProfile.name})`,
  };
}

// Backward compatibility alias
export type NeurodivergentProfile = CognitiveProfile;
