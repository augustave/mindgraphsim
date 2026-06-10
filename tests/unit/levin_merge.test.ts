// Regression test for the Levin pattern merge bug surfaced by a user-exported
// run JSON: `Anchored @ MindGraphSim` was missing mgs from its node list, and
// all anchored constellations collapsed onto a single pattern because the
// merge was keyed only by `tag + type` instead of including an instance key.
//
// We re-implement the merge predicate here (it lives inline in engine.ts as
// a tight loop, not behind an exportable function) so we can lock in its
// contract from the modular test surface. If you refactor the merge, mirror
// the change here.

import { describe, it, expect } from 'vitest';

type LevinPattern = {
  id: string;
  type: 'levin';
  tag: string;
  instance_key?: string;
  name: string;
  object_ids: string[];
  lifetime_steps: number;
};

function mergeOrPush(existing: LevinPattern[], incoming: LevinPattern[]): LevinPattern[] {
  for (const newP of incoming) {
    const match = existing.find(p =>
      p.type === 'levin' &&
      p.tag === newP.tag &&
      (p.instance_key ? p.instance_key === newP.instance_key : true)
    );
    if (match) {
      match.lifetime_steps++;
      match.object_ids = newP.object_ids;
      match.name = newP.name;
      match.instance_key = newP.instance_key;
    } else {
      existing.push(newP);
    }
  }
  return existing;
}

const anchorPattern = (
  anchorId: string,
  anchorLabel: string,
  members: string[],
): LevinPattern => ({
  id: `lp_anchor_${anchorId}_0`,
  type: 'levin',
  tag: 'anchored_memory',
  instance_key: `anchor:${anchorId}`,
  name: `Anchored @ ${anchorLabel}`,
  object_ids: [anchorId, ...members],
  lifetime_steps: 0,
});

describe('Levin pattern merge', () => {
  it('keeps one pattern per anchor instead of collapsing them', () => {
    const state: LevinPattern[] = [];
    mergeOrPush(state, [
      anchorPattern('mgs', 'MindGraphSim', ['cf', 'md']),
      anchorPattern('fv', 'Feature Vector', ['gold', 'iron_m']),
      anchorPattern('sw', 'Scalar Weight', ['carbon', 'copper']),
    ]);
    expect(state).toHaveLength(3);
    expect(state.map(p => p.name).sort()).toEqual([
      'Anchored @ Feature Vector',
      'Anchored @ MindGraphSim',
      'Anchored @ Scalar Weight',
    ]);
  });

  it('"Anchored @ X" always contains the anchor itself', () => {
    const state: LevinPattern[] = [];
    mergeOrPush(state, [
      anchorPattern('mgs', 'MindGraphSim', ['cf', 'md']),
      anchorPattern('fv', 'Feature Vector', ['gold', 'iron_m']),
    ]);
    for (const p of state) {
      const match = p.name.match(/Anchored @ (.+)$/);
      expect(match).not.toBeNull();
      // The pattern's instance_key carries the anchor id; that id must be in object_ids.
      const anchorId = p.instance_key?.replace(/^anchor:/, '') ?? '';
      expect(p.object_ids).toContain(anchorId);
    }
  });

  it('subsequent ticks update object_ids, name, and lifetime — not creating duplicates', () => {
    const state: LevinPattern[] = [];
    mergeOrPush(state, [anchorPattern('mgs', 'MindGraphSim', ['cf'])]);
    // Tick: members grow, label still anchored at mgs.
    mergeOrPush(state, [anchorPattern('mgs', 'MindGraphSim', ['cf', 'md', 'rlaif'])]);
    expect(state).toHaveLength(1);
    expect(state[0].object_ids).toEqual(['mgs', 'cf', 'md', 'rlaif']);
    expect(state[0].lifetime_steps).toBe(1);
  });

  it('singleton-tagged patterns (e.g. Connection Hub) still merge by tag', () => {
    const hub = (size: number): LevinPattern => ({
      id: `lp_bridge_0`,
      type: 'levin',
      tag: 'connection_hub',
      instance_key: 'singleton',
      name: `Connection Hub (${size})`,
      object_ids: Array.from({ length: size }, (_, i) => `n${i}`),
      lifetime_steps: 0,
    });
    const state: LevinPattern[] = [];
    mergeOrPush(state, [hub(3)]);
    mergeOrPush(state, [hub(4)]);
    mergeOrPush(state, [hub(5)]);
    expect(state).toHaveLength(1);
    expect(state[0].name).toBe('Connection Hub (5)');
    expect(state[0].lifetime_steps).toBe(2);
  });
});
