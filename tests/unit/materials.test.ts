import { describe, it, expect } from 'vitest';
import { materialLibrary, MaterialLibrary } from '../../src/materials';

describe('materials', () => {
  it('singleton exposes 31 materials across three categories', () => {
    const all = materialLibrary.list();
    expect(all.length).toBeGreaterThanOrEqual(30);
    const grouped = materialLibrary.listByCategory();
    expect(grouped.metal.length).toBeGreaterThan(0);
    expect(grouped.mineral.length).toBeGreaterThan(0);
    expect(grouped.bio.length).toBeGreaterThan(0);
    expect(
      grouped.metal.length + grouped.mineral.length + grouped.bio.length,
    ).toBe(all.length);
  });

  it('get returns the requested material', () => {
    const gold = materialLibrary.get('gold');
    expect(gold.id).toBe('gold');
    expect(gold.category).toBe('metal');
  });

  it('computeCompatibility is symmetric and self-compatibility is 1', () => {
    const lib = new MaterialLibrary();
    const c_self = lib.computeCompatibility('gold', 'gold');
    expect(c_self).toBeCloseTo(1, 6);
    const c_ab = lib.computeCompatibility('gold', 'copper');
    const c_ba = lib.computeCompatibility('copper', 'gold');
    expect(c_ab).toBeCloseTo(c_ba, 6);
  });
});
