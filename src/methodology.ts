// MindGraphSim - Methodology Decider (MD)
// Chooses strategic posture and scores objects

import { CognitiveObject, SimulationState, ExpandedFeatureVector } from './types';
import { StrategicPosture, getPosture, POSTURES } from './postures';

export interface ScoredObject {
  id: string;
  label: string;
  score: number;
  confidence_adjusted_score: number;
  breakdown: Record<keyof ExpandedFeatureVector, number>;
}

export interface PostureRecommendation {
  recommended_posture: string;
  reason: string;
  scores: Record<string, number>;
}

export class MethodologyDecider {
  private currentPosture: StrategicPosture;

  constructor(postureId: string = 'consolidation') {
    this.currentPosture = getPosture(postureId);
  }

  // ============================================
  // Posture Management
  // ============================================

  setPosture(postureId: string): void {
    this.currentPosture = getPosture(postureId);
  }

  getPosture(): StrategicPosture {
    return this.currentPosture;
  }

  // ============================================
  // Object Scoring (RLAIF-style)
  // ============================================

  scoreObject(obj: CognitiveObject): ScoredObject {
    const weights = this.currentPosture.weights;
    const fv = obj.feature_vector;

    const breakdown: Record<keyof ExpandedFeatureVector, number> = {} as any;
    let rawScore = 0;

    const keys = Object.keys(weights) as (keyof ExpandedFeatureVector)[];
    for (const key of keys) {
      const contribution = fv[key] * weights[key];
      breakdown[key] = contribution;
      rawScore += contribution;
    }

    // Normalize by sum of weights
    const weightSum = keys.reduce((sum, k) => sum + weights[k], 0);
    const normalizedScore = rawScore / weightSum;

    // Apply confidence as global multiplier
    const confidenceAdjusted = normalizedScore * obj.confidence;

    return {
      id: obj.id,
      label: obj.label,
      score: normalizedScore,
      confidence_adjusted_score: confidenceAdjusted,
      breakdown,
    };
  }

  scoreAllObjects(state: SimulationState): ScoredObject[] {
    const scored: ScoredObject[] = [];

    for (const obj of state.objects.values()) {
      scored.push(this.scoreObject(obj));
    }

    // Sort by confidence-adjusted score descending
    scored.sort((a, b) => b.confidence_adjusted_score - a.confidence_adjusted_score);

    return scored;
  }

  // ============================================
  // Posture Recommendation
  // ============================================

  recommendPosture(state: SimulationState): PostureRecommendation {
    const scores: Record<string, number> = {};

    // Score each posture against current state
    for (const [postureId, posture] of Object.entries(POSTURES)) {
      scores[postureId] = this.evaluatePostureFit(state, posture);
    }

    // Find best fit
    let best = 'consolidation';
    let bestScore = -Infinity;
    for (const [id, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }

    const reason = this.explainRecommendation(state, best);

    return {
      recommended_posture: best,
      reason,
      scores,
    };
  }

  private evaluatePostureFit(state: SimulationState, posture: StrategicPosture): number {
    // Compute average feature vector of all objects
    const objects = Array.from(state.objects.values());
    if (objects.length === 0) return 0;

    const avgFV: ExpandedFeatureVector = {
      novelty: 0, utility: 0, connectivity: 0, stability: 0,
      effort: 0, feasibility: 0, reach: 0, strategic_fit: 0,
      customer_value: 0, time_to_impact: 0, extendibility: 0, imitability: 0,
    };

    for (const obj of objects) {
      for (const key of Object.keys(avgFV) as (keyof ExpandedFeatureVector)[]) {
        avgFV[key] += obj.feature_vector[key];
      }
    }

    for (const key of Object.keys(avgFV) as (keyof ExpandedFeatureVector)[]) {
      avgFV[key] /= objects.length;
    }

    // Compute alignment with posture weights
    let alignment = 0;
    const weights = posture.weights;
    for (const key of Object.keys(weights) as (keyof ExpandedFeatureVector)[]) {
      // High weight + high value = good alignment
      alignment += weights[key] * avgFV[key];
    }

    // Factor in ambient conditions
    const overloadRisk = this.computeOverloadRisk(state);
    const patternDiversity = state.patterns.size / Math.max(1, objects.length);

    // Adjust based on posture type
    if (posture.id === 'defensive' && overloadRisk > 0.7) {
      alignment *= 1.3; // Defensive is better when overload risk is high
    }
    if (posture.id === 'exploration' && patternDiversity < 0.3) {
      alignment *= 1.2; // Exploration is better when diversity is low
    }
    if (posture.id === 'quick_wins' && overloadRisk < 0.3) {
      alignment *= 1.2; // Quick wins when stable
    }

    return alignment;
  }

  private computeOverloadRisk(state: SimulationState): number {
    const severedCount = Array.from(state.edges.values()).filter(e => e.severed).length;
    const totalEdges = state.edges.size;
    if (totalEdges === 0) return 0;
    return severedCount / totalEdges;
  }

  private explainRecommendation(state: SimulationState, postureId: string): string {
    const overloadRisk = this.computeOverloadRisk(state);
    const patternCount = state.patterns.size;
    const objectCount = state.objects.size;

    switch (postureId) {
      case 'aggressive_growth':
        return `Low overload risk (${(overloadRisk * 100).toFixed(0)}%) and room for expansion with ${objectCount} objects.`;
      case 'consolidation':
        return `Moderate conditions suggest stabilizing existing ${patternCount} patterns.`;
      case 'quick_wins':
        return `Stable environment (${(overloadRisk * 100).toFixed(0)}% risk) favors fast, low-effort wins.`;
      case 'exploration':
        return `Low pattern diversity (${patternCount} patterns) suggests exploring new territory.`;
      case 'defensive':
        return `High overload risk (${(overloadRisk * 100).toFixed(0)}%) requires protective posture.`;
      default:
        return `Based on current state analysis.`;
    }
  }

  // ============================================
  // Cluster Analysis
  // ============================================

  identifyQuickWins(state: SimulationState, topN: number = 5): ScoredObject[] {
    // Temporarily switch to quick_wins posture
    const originalPosture = this.currentPosture;
    this.currentPosture = getPosture('quick_wins');

    const scored = this.scoreAllObjects(state);

    // Restore original posture
    this.currentPosture = originalPosture;

    return scored.slice(0, topN);
  }

  identifyMoonshots(state: SimulationState, topN: number = 5): ScoredObject[] {
    // Temporarily switch to exploration posture
    const originalPosture = this.currentPosture;
    this.currentPosture = getPosture('exploration');

    const scored = this.scoreAllObjects(state);

    // Restore original posture
    this.currentPosture = originalPosture;

    // Filter for high novelty, low feasibility
    const moonshots = scored.filter(s => {
      const obj = state.objects.get(s.id);
      if (!obj) return false;
      return obj.feature_vector.novelty > 0.7 && obj.feature_vector.feasibility < 0.5;
    });

    return moonshots.slice(0, topN);
  }
}
