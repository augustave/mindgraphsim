// MindGraphSim - RLAIF Reward Function
// Weighted sum of feature vector with confidence multiplier

import { CognitiveObject, ExpandedFeatureVector, SimulationState } from './types';
import { PostureWeights, StrategicPosture } from './postures';

export interface RewardResult {
  object_id: string;
  raw_reward: number;
  confidence_adjusted: number;
  components: Record<keyof ExpandedFeatureVector, number>;
}

export interface SystemReward {
  total_reward: number;
  avg_reward: number;
  max_reward: RewardResult | null;
  min_reward: RewardResult | null;
  distribution: RewardResult[];
}

/**
 * Compute reward for a single cognitive object
 */
export function computeReward(
  obj: CognitiveObject,
  weights: PostureWeights
): RewardResult {
  const fv = obj.feature_vector;
  const components: Record<keyof ExpandedFeatureVector, number> = {} as any;

  let rawReward = 0;
  const keys = Object.keys(weights) as (keyof ExpandedFeatureVector)[];

  for (const key of keys) {
    const component = fv[key] * weights[key];
    components[key] = component;
    rawReward += component;
  }

  // Confidence acts as global multiplier
  const confidenceAdjusted = rawReward * obj.confidence;

  return {
    object_id: obj.id,
    raw_reward: rawReward,
    confidence_adjusted: confidenceAdjusted,
    components,
  };
}

/**
 * Compute reward for a single object using a posture
 */
export function computeRewardWithPosture(
  obj: CognitiveObject,
  posture: StrategicPosture
): RewardResult {
  return computeReward(obj, posture.weights);
}

/**
 * Compute system-wide reward metrics
 */
export function computeSystemReward(
  state: SimulationState,
  weights: PostureWeights
): SystemReward {
  const distribution: RewardResult[] = [];
  let totalReward = 0;
  let maxReward: RewardResult | null = null;
  let minReward: RewardResult | null = null;

  for (const obj of state.objects.values()) {
    const result = computeReward(obj, weights);
    distribution.push(result);
    totalReward += result.confidence_adjusted;

    if (!maxReward || result.confidence_adjusted > maxReward.confidence_adjusted) {
      maxReward = result;
    }
    if (!minReward || result.confidence_adjusted < minReward.confidence_adjusted) {
      minReward = result;
    }
  }

  const avgReward = distribution.length > 0 ? totalReward / distribution.length : 0;

  // Sort by confidence-adjusted reward descending
  distribution.sort((a, b) => b.confidence_adjusted - a.confidence_adjusted);

  return {
    total_reward: totalReward,
    avg_reward: avgReward,
    max_reward: maxReward,
    min_reward: minReward,
    distribution,
  };
}

/**
 * Compute reward delta between two states
 */
export function computeRewardDelta(
  before: SimulationState,
  after: SimulationState,
  weights: PostureWeights
): number {
  const rewardBefore = computeSystemReward(before, weights);
  const rewardAfter = computeSystemReward(after, weights);
  return rewardAfter.total_reward - rewardBefore.total_reward;
}

/**
 * Identify objects with highest reward potential (gap between current and max)
 */
export function identifyHighPotential(
  state: SimulationState,
  weights: PostureWeights,
  topN: number = 5
): { object_id: string; current: number; potential: number; gap: number }[] {
  const results: { object_id: string; current: number; potential: number; gap: number }[] = [];

  // Max possible reward per dimension is 1.0 * weight
  const maxPossible = Object.values(weights).reduce((sum, w) => sum + w, 0);

  for (const obj of state.objects.values()) {
    const reward = computeReward(obj, weights);
    const potential = maxPossible * obj.confidence;
    const gap = potential - reward.confidence_adjusted;

    results.push({
      object_id: obj.id,
      current: reward.confidence_adjusted,
      potential,
      gap,
    });
  }

  // Sort by gap descending
  results.sort((a, b) => b.gap - a.gap);

  return results.slice(0, topN);
}

/**
 * Compute reward contribution by dimension
 */
export function analyzeRewardContribution(
  state: SimulationState,
  weights: PostureWeights
): Record<keyof ExpandedFeatureVector, { total: number; avg: number; weight: number }> {
  const keys = Object.keys(weights) as (keyof ExpandedFeatureVector)[];
  const result: Record<keyof ExpandedFeatureVector, { total: number; avg: number; weight: number }> = {} as any;

  for (const key of keys) {
    result[key] = { total: 0, avg: 0, weight: weights[key] };
  }

  const objects = Array.from(state.objects.values());
  if (objects.length === 0) return result;

  for (const obj of objects) {
    for (const key of keys) {
      result[key].total += obj.feature_vector[key] * weights[key] * obj.confidence;
    }
  }

  for (const key of keys) {
    result[key].avg = result[key].total / objects.length;
  }

  return result;
}
