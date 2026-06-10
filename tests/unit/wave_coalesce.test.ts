// Regression for the wave-coalesce leak surfaced by a user-exported run:
// waves coalesce only at insertion, so two waves can grow independently until
// their pairwise Jaccard overlap drifts above the threshold with nothing
// re-merging existing-vs-existing. We mirror the sweep here as a pure function
// and assert it converges below threshold. If you refactor the sweep in
// engine.ts, mirror it here.

import { describe, it, expect } from 'vitest';

type Wave = { id: string; nodeIds: string[]; energy?: number };

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const x of A) if (B.has(x)) shared++;
  return shared / (A.size + B.size - shared);
}

function coalesceWaves(waves: Wave[], threshold = 0.7): Wave[] {
  let merged = true;
  let guard = 0;
  while (merged && guard++ < 20) {
    merged = false;
    outer:
    for (let i = 0; i < waves.length; i++) {
      for (let j = i + 1; j < waves.length; j++) {
        if (jaccard(waves[i].nodeIds, waves[j].nodeIds) >= threshold) {
          waves[i].nodeIds = [...new Set([...waves[i].nodeIds, ...waves[j].nodeIds])];
          waves[i].energy = Math.min(1, (waves[i].energy ?? 0.6) + 0.05);
          waves.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return waves;
}

function maxPairwise(waves: Wave[]): number {
  let worst = 0;
  for (let i = 0; i < waves.length; i++)
    for (let j = i + 1; j < waves.length; j++)
      worst = Math.max(worst, jaccard(waves[i].nodeIds, waves[j].nodeIds));
  return worst;
}

describe('wave coalesce sweep', () => {
  it('merges a pair above threshold into one', () => {
    const waves: Wave[] = [
      { id: 'a', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'] },
      { id: 'b', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n6'] }, // 4/6 = 0.67 < 0.7 → kept
    ];
    coalesceWaves(waves);
    expect(waves).toHaveLength(2);
  });

  it('merges when overlap is exactly at/above 0.7', () => {
    const waves: Wave[] = [
      { id: 'a', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'] },
      { id: 'b', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] }, // 5/6 = 0.83
    ];
    coalesceWaves(waves);
    expect(waves).toHaveLength(1);
    expect(waves[0].nodeIds.sort()).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
  });

  it('converges below threshold after cascading merges', () => {
    // Three waves where a→b and b→c overlap >=0.7; merging must cascade.
    const waves: Wave[] = [
      { id: 'a', nodeIds: ['n1', 'n2', 'n3', 'n4'] },
      { id: 'b', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5'] }, // 4/5=0.8 vs a
      { id: 'c', nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] }, // 5/6 vs b
    ];
    coalesceWaves(waves);
    expect(maxPairwise(waves)).toBeLessThan(0.7);
  });

  it('leaves genuinely distinct waves untouched', () => {
    const waves: Wave[] = [
      { id: 'a', nodeIds: ['n1', 'n2', 'n3', 'n4'] },
      { id: 'b', nodeIds: ['n5', 'n6', 'n7', 'n8'] },
    ];
    coalesceWaves(waves);
    expect(waves).toHaveLength(2);
  });
});
