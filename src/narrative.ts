// [S5 T2] Narrative Generator
//
// Pure analyzer over a Recorder buffer — no state, DOM, or sibling-module
// dependencies. Extracted from engine.ts to start the Phase 3 god-file split.
// The buffer shape comes from Recorder.capture() and is intentionally loose
// here so this module doesn't drag in the legacy engine state type.

export interface NarrativeFrame {
  step: number;
  overloads?: number;
  metrics: { patternDensity?: number;[key: string]: unknown };
  patterns?: { type: string;[key: string]: unknown }[];
}

export const NarrativeGenerator = {
  analyze: (buffer: NarrativeFrame[] | null | undefined): string => {
    if (!buffer || buffer.length === 0) return "No data recorded.";

    let sumDensity = 0;
    let maxDensity = 0;
    const patternCounts: Record<string, number> = {};

    buffer.forEach(frame => {
      const d = frame.metrics.patternDensity || 0;
      sumDensity += d;
      if (d > maxDensity) maxDensity = d;

      if (frame.patterns) {
        frame.patterns.forEach(p => {
          patternCounts[p.type] = (patternCounts[p.type] || 0) + 1;
        });
      }
    });

    const avgDensity = (sumDensity / buffer.length).toFixed(2);
    const peakDensity = maxDensity.toFixed(2);

    let dominantPattern = 'None';
    let maxCount = 0;
    for (const [type, count] of Object.entries(patternCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantPattern = type;
      }
    }

    // Safety check for legacy buffers without overloads
    const startOverloads = buffer[0].overloads || 0;
    const endOverloads = buffer[buffer.length - 1].overloads || 0;
    const newOverloads = Math.max(0, endOverloads - startOverloads);

    let mood = 'calm';
    const avgDensityNum = parseFloat(avgDensity);
    if (avgDensityNum > 1.5) mood = 'busy';
    if (avgDensityNum > 3.0) mood = 'chaotic';

    return `Session Summary:
The session was generally ${mood} (Avg Density: ${avgDensity}, Peak: ${peakDensity}).
New Overloads: ${newOverloads}.
Dominant Pattern: ${dominantPattern}.`;
  }
};
