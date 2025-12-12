// MindGraphSim - Strategic Postures
// Weight profiles for different strategic goals

import { ExpandedFeatureVector } from './types';

export type PostureWeights = Record<keyof ExpandedFeatureVector, number>;

export interface StrategicPosture {
  id: string;
  name: string;
  description: string;
  weights: PostureWeights;
}

export const POSTURES: Record<string, StrategicPosture> = {
  aggressive_growth: {
    id: 'aggressive_growth',
    name: 'Aggressive Growth',
    description: 'Prioritize reach, speed, and novelty over stability',
    weights: {
      novelty: 0.8,
      utility: 0.6,
      connectivity: 0.9,
      stability: 0.3,
      effort: 0.4,
      feasibility: 0.5,
      reach: 1.0,
      strategic_fit: 0.7,
      customer_value: 0.9,
      time_to_impact: 0.9,
      extendibility: 0.6,
      imitability: 0.5,
    },
  },

  consolidation: {
    id: 'consolidation',
    name: 'Consolidation',
    description: 'Prioritize stability, feasibility, and low effort',
    weights: {
      novelty: 0.3,
      utility: 0.9,
      connectivity: 0.7,
      stability: 0.95,
      effort: 0.8,
      feasibility: 0.9,
      reach: 0.5,
      strategic_fit: 0.8,
      customer_value: 0.7,
      time_to_impact: 0.6,
      extendibility: 0.8,
      imitability: 0.7,
    },
  },

  quick_wins: {
    id: 'quick_wins',
    name: 'Quick Wins',
    description: 'Prioritize low effort, high feasibility, fast time-to-impact',
    weights: {
      novelty: 0.4,
      utility: 0.8,
      connectivity: 0.5,
      stability: 0.6,
      effort: 1.0,
      feasibility: 0.95,
      reach: 0.6,
      strategic_fit: 0.5,
      customer_value: 0.7,
      time_to_impact: 1.0,
      extendibility: 0.3,
      imitability: 0.2,
    },
  },

  exploration: {
    id: 'exploration',
    name: 'Exploration',
    description: 'Prioritize novelty and extendibility, accept lower feasibility',
    weights: {
      novelty: 1.0,
      utility: 0.5,
      connectivity: 0.8,
      stability: 0.4,
      effort: 0.3,
      feasibility: 0.4,
      reach: 0.7,
      strategic_fit: 0.4,
      customer_value: 0.6,
      time_to_impact: 0.3,
      extendibility: 0.95,
      imitability: 0.8,
    },
  },

  defensive: {
    id: 'defensive',
    name: 'Defensive',
    description: 'Prioritize stability, imitability (moat), and strategic fit',
    weights: {
      novelty: 0.4,
      utility: 0.7,
      connectivity: 0.6,
      stability: 1.0,
      effort: 0.7,
      feasibility: 0.8,
      reach: 0.4,
      strategic_fit: 0.9,
      customer_value: 0.6,
      time_to_impact: 0.5,
      extendibility: 0.7,
      imitability: 1.0,
    },
  },
};

export function getPosture(id: string): StrategicPosture {
  return POSTURES[id] ?? POSTURES.consolidation;
}

export function listPostures(): StrategicPosture[] {
  return Object.values(POSTURES);
}

export function createCustomPosture(
  base: string,
  overrides: Partial<StrategicPosture>
): StrategicPosture {
  const basePosture = getPosture(base);
  return {
    ...basePosture,
    ...overrides,
    id: overrides.id ?? `custom_${Date.now()}`,
    name: overrides.name ?? `Custom (based on ${basePosture.name})`,
    weights: {
      ...basePosture.weights,
      ...(overrides.weights ?? {}),
    },
  };
}

export function blendPostures(
  postures: { posture: StrategicPosture; weight: number }[]
): PostureWeights {
  const totalWeight = postures.reduce((sum, p) => sum + p.weight, 0);
  const result: Partial<PostureWeights> = {};

  const keys = Object.keys(POSTURES.consolidation.weights) as (keyof ExpandedFeatureVector)[];
  
  for (const key of keys) {
    result[key] = postures.reduce(
      (sum, p) => sum + p.posture.weights[key] * (p.weight / totalWeight),
      0
    );
  }

  return result as PostureWeights;
}
