import { describe, it, expect } from 'vitest';
import { PROFILES, getProfile, listProfiles, createCustomProfile } from '../../src/profiles';

describe('profiles', () => {
  it('exposes the open_neutral baseline', () => {
    const p = getProfile('open_neutral');
    expect(p.id).toBe('open_neutral');
    expect(p.base_connectivity_gain).toBe(1.0);
    expect(p.gravitation_multiplier).toBe(1.0);
  });

  it('listProfiles returns every entry in PROFILES', () => {
    const list = listProfiles();
    expect(list).toHaveLength(Object.keys(PROFILES).length);
    for (const profile of list) {
      expect(PROFILES[profile.id]).toBe(profile);
    }
  });

  it('getProfile falls back to a sensible default for unknown ids', () => {
    // Whatever the fallback is, it must be a real profile shape, not undefined.
    const p = getProfile('does_not_exist');
    expect(p).toBeDefined();
    expect(typeof p.id).toBe('string');
    expect(typeof p.base_connectivity_gain).toBe('number');
  });

  it('createCustomProfile inherits unspecified fields from the base', () => {
    const custom = createCustomProfile('open_neutral', { id: 'custom_x', name: 'Custom' });
    const base = getProfile('open_neutral');
    expect(custom.id).toBe('custom_x');
    expect(custom.name).toBe('Custom');
    expect(custom.base_connectivity_gain).toBe(base.base_connectivity_gain);
    expect(custom.gravitation_multiplier).toBe(base.gravitation_multiplier);
  });
});
