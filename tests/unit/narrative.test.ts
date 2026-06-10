import { describe, it, expect } from 'vitest';
import { NarrativeGenerator, type NarrativeFrame } from '../../src/narrative';

function frame(step: number, density: number, overloads: number, patternTypes: string[]): NarrativeFrame {
  return {
    step,
    overloads,
    metrics: { patternDensity: density },
    patterns: patternTypes.map(t => ({ type: t })),
  };
}

describe('NarrativeGenerator', () => {
  it('returns a sentinel for empty buffers', () => {
    expect(NarrativeGenerator.analyze([])).toBe('No data recorded.');
    expect(NarrativeGenerator.analyze(null)).toBe('No data recorded.');
    expect(NarrativeGenerator.analyze(undefined)).toBe('No data recorded.');
  });

  it('classifies a low-density session as calm', () => {
    const buf = [
      frame(0, 0.5, 0, ['loop']),
      frame(1, 0.8, 0, ['loop', 'cluster']),
    ];
    const out = NarrativeGenerator.analyze(buf);
    expect(out).toContain('calm');
    expect(out).toContain('Dominant Pattern: loop');
    expect(out).toContain('New Overloads: 0');
  });

  it('classifies mid-density as busy and reports the dominant pattern', () => {
    const buf = [
      frame(0, 2.0, 1, ['cluster', 'cluster']),
      frame(1, 2.5, 3, ['cluster']),
    ];
    const out = NarrativeGenerator.analyze(buf);
    expect(out).toContain('busy');
    expect(out).toContain('Dominant Pattern: cluster');
    // Overloads should be end - start = 3 - 1 = 2.
    expect(out).toContain('New Overloads: 2');
  });

  it('classifies high-density as chaotic', () => {
    const buf = [frame(0, 4.0, 0, ['wave']), frame(1, 5.0, 5, ['wave'])];
    const out = NarrativeGenerator.analyze(buf);
    expect(out).toContain('chaotic');
  });

  it('peak density tracks the max, not the last frame', () => {
    const buf = [
      frame(0, 0.1, 0, ['loop']),
      frame(1, 3.5, 0, ['loop']),
      frame(2, 0.2, 0, ['loop']),
    ];
    const out = NarrativeGenerator.analyze(buf);
    expect(out).toContain('Peak: 3.50');
  });

  it('treats missing overloads on legacy frames as zero', () => {
    const buf: NarrativeFrame[] = [
      { step: 0, metrics: { patternDensity: 0.5 }, patterns: [] },
      { step: 1, metrics: { patternDensity: 0.5 }, patterns: [] },
    ];
    const out = NarrativeGenerator.analyze(buf);
    expect(out).toContain('New Overloads: 0');
  });
});
