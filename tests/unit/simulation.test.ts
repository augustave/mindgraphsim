import { describe, it, expect } from 'vitest';
import { SimulationCore } from '../../src/simulation';

function seed(sim: SimulationCore) {
  sim.addObject({ id: 'a', label: 'A', material_type: 'gold', activation: 0.9, position: { x: 0, y: 0, z: 0 } });
  sim.addObject({ id: 'b', label: 'B', material_type: 'copper', activation: 0.5, position: { x: 1, y: 0, z: 0 } });
  sim.addObject({ id: 'c', label: 'C', material_type: 'iron_metal', activation: 0.3, position: { x: 0, y: 1, z: 0 } });
  sim.addEdge({ id: 'ab', source_id: 'a', target_id: 'b', relation_type: 'support' });
  sim.addEdge({ id: 'bc', source_id: 'b', target_id: 'c', relation_type: 'association' });
}

describe('SimulationCore', () => {
  it('starts with an empty state and the configured profile', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    const state = sim.getState();
    expect(state.step).toBe(0);
    expect(state.objects.size).toBe(0);
    expect(state.edges.size).toBe(0);
    expect(sim.getProfile().id).toBe('open_neutral');
  });

  it('addObject / addEdge register entries and getObject looks them up', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    seed(sim);
    expect(sim.getState().objects.size).toBe(3);
    expect(sim.getState().edges.size).toBe(2);
    expect(sim.getObject('a')?.id).toBe('a');
    expect(sim.getEdge('ab')?.source_id).toBe('a');
    expect(sim.getEdge('ab')?.target_id).toBe('b');
  });

  it('removeObject removes incident edges', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    seed(sim);
    sim.removeObject('b');
    expect(sim.getObject('b')).toBeUndefined();
    // Both edges touch b, so both should be gone.
    expect(sim.getEdge('ab')).toBeUndefined();
    expect(sim.getEdge('bc')).toBeUndefined();
  });

  it('step advances state.step by one and run(n) advances by n', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    seed(sim);
    sim.step();
    expect(sim.getState().step).toBe(1);
    sim.run(9);
    expect(sim.getState().step).toBe(10);
  });

  it('exportState / importState round-trip is stable on object and edge counts', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    seed(sim);
    sim.run(5);
    const json = sim.exportState();
    const sim2 = new SimulationCore({ profile_id: 'open_neutral' });
    sim2.importState(json);
    expect(sim2.getState().objects.size).toBe(sim.getState().objects.size);
    expect(sim2.getState().edges.size).toBe(sim.getState().edges.size);
    expect(sim2.getState().step).toBe(sim.getState().step);
  });

  it('reset clears state but preserves the profile', () => {
    const sim = new SimulationCore({ profile_id: 'open_neutral' });
    seed(sim);
    sim.run(3);
    sim.reset();
    expect(sim.getState().step).toBe(0);
    expect(sim.getState().objects.size).toBe(0);
    expect(sim.getProfile().id).toBe('open_neutral');
  });
});
