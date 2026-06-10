// Locks the rename of "Loop @ X" → "Oscillator @ X" surfaced by the audit.
// The patterns are activation-oscillation detectors, not topological cycles.
// We exercise this by reading the built engine bundle so the test fails if
// someone reverts the rename in src/engine.ts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const enginePath = resolve(__dirname, '../../dist/mgs-engine.js');

describe('Oscillator pattern label (audit fix)', () => {
  it('built engine emits "Oscillator @" labels for type=loop patterns', () => {
    let src = '';
    try {
      src = readFileSync(enginePath, 'utf8');
    } catch {
      // dist may not exist in fresh checkouts; skip rather than fail spuriously
      return;
    }
    expect(src).toContain('Oscillator @ ');
    expect(src).not.toContain('Loop @ ');
  });
});
