# MindGraphSim v0.8 S2

**A simulation engine for how ideas move.**

MindGraphSim is a cognitive dynamics engine that models attention, memory, and emotion as one continuous field. It lets you observe and manipulate the physics of thought: how concepts attract, repel, merge, fracture, and form stable patterns.

Ideas are treated as physical objects moving in a shared space. Each has properties like mass, material type, charge, reach, and sensory texture. These objects interact through forces representing attention, attraction, repulsion, overload, and fatigue.


<img width="2048" height="1141" alt="Screenshot 2025-12-25 at 11 56 51 AM" src="https://github.com/user-attachments/assets/4e520dc3-154a-4c09-bcee-5462bb0e19bf" />



## S2 Features: Patterns, Time, Lenses

### Pattern Tracker

Detects and displays recurrent activation patterns as named agents:

- **Loops** - Oscillating activation between connected nodes
- **Clusters** - Groups of highly-activated connected nodes
- **Waves** - Propagating activation fronts across the graph
- Click patterns to highlight their nodes on the graph
- Patterns age, decay, merge, and dissolve over time

### Node Interaction

Direct manipulation of the cognitive graph:

- **Hover** - Highlight node with yellow ring
- **Drag** - Reposition nodes manually
- **Shift+Click** - Boost activation (+0.3)
- **Double-Click** - Stress test (increase sensory load + noise)

### Timeline Scrubber & Replay

- Automatic snapshots every 10 steps (up to 1000)
- Scrub back through history to study past states
- Step forward/back controls
- Live vs Replay mode indicator

### Material & Metric Lenses

Overlay visualizations on the graph:

- **None** - Default view
- **Material Type** - Color by metal/mineral/bio
- **Activation** - Node size by activation level
- **Sensitivity** - Halo by sensory sensitivity
- **Overload Risk** - Heat color by overload probability

### Scene Presets

Prebuilt starting configurations:

- **Blank** - Empty canvas
- **Idea + Anchors** - Core idea with two stabilizing anchors
- **Research Mesh** - Question → Sources → Notes → Synthesis
- **Tension Bridge** - Two opposing positions with a bridge
- **Brainstorm Net** - Dense diverging network

### Safety HUD

Real-time overload monitoring:

- Global overload index (0-1)
- Cluster stress count
- Recovery trend indicator (↑ ↓ →)
- Advisory warnings for sustained high overload

### Export & Sharing

- **State JSON** - Full state with nodes, edges, patterns, timeline
- **Run Summary** - Text summary of the run
- **Graph Image** - PNG of current view

## Key Concepts

### Cognitive Objects

Ideas are bodies with:

- **Mass** - Inertia, resistance to change
- **Material** - 31 types (metals, minerals, bio-elements) with unique behaviors
- **Charge** - Emotional, social, sensory valence
- **Light Cone** - Spatial and temporal reach of influence
- **12D Feature Vector** - Novelty, utility, connectivity, stability + 8 extended dimensions

### Cognitive Profiles

Parameter presets that shape dynamics:

- **General Cognitive Field** - Neutral starting configuration for most users
- **Autistic Intensity** - High sensory gain, tight local connectivity, strong pattern persistence
- **ADHD Scatter-Focus** - Fast switching, wide but shallow reach, periodic hyperfocus wells
- **Meditative Slow Field** - Low noise, slow drift, wide and gentle attractors

### Physics Forces

- **Gravitation** - Attraction based on mass and material compatibility
- **Repulsion** - From charge conflicts and sensory saturation
- **Drag** - Resistance from ambient field and fatigue
- **Spring Tension** - Stored energy along edges

### Ambient Field

Global background conditions:

- Baseline arousal
- Noise level
- Safety index
- Body state (hunger, fatigue, pain)

### Overload & Recovery

When sensory load exceeds threshold:

- Edges are severed (weakest first)
- Activation drops
- Recovery progresses over time based on safety and profile

## Quick Start

The live site shows the v1 Lab UI.

```bash
npm install
npm run dev          # Vite dev server on :3000
npm run build:all    # produces dist/index.html + dist/mgs-engine.js
npm test             # regression + QA harnesses
```

Open `dist/index.html` in any modern browser after `npm run build`.

## Development & Analysis

Sources live in `src/`. The Lab UI entry is `index.html` → `src/lab_view.ts` → `src/engine.ts`. The Vite engine config bundles `src/engine.ts` to a standalone IIFE at `dist/mgs-engine.js` for external consumers and the regression harness.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (port 3000) |
| `npm run check` | `tsc --noEmit` over all of `src/` (loose) |
| `npm run check:strict` | Strict typecheck of the modular library (everything except the legacy `engine.ts` / `lab_view.ts`). CI runs this to prevent regressions. |
| `npm run build` | Vite build of the site → `dist/index.html` + `dist/assets/` |
| `npm run build:engine` | Vite build of the standalone engine bundle → `dist/mgs-engine.js` |
| `npm run build:all` | Site, then engine (site must run first; engine config has `emptyOutDir: false`) |
| `npm run build:lib` | `tsc` declaration emit + engine bundle |
| `npm test` | Runs the QA + regression harnesses against the freshly built engine |

### Verification (QA)

```bash
npm run build:engine
node tests/generate_qa_report.cjs                  # density/pattern regression
node tests/generate_s3_model_comparison_report.cjs # baseline vs pattern-coupled
node tests/test_regression.cjs                     # core regression suite
```

### Site Build Agent Contract

All automated edits for the Vercel site must respect `docs/mindgraphsim_site_agent_instructions.yaml`.
Agents/tools are only allowed to change build config, TypeScript types, and dead imports.
Physics and UX semantics are governed by the MindGraphSim engine PRDs (S2–S6).

See the [CI Status Report (S6)](docs/mindgraphsim_s6_ci_status.yaml) for the specific physics constraints certified for v1.0.

### 2. Lab Reports

Generate a unified YAML report of the current engine state, including system info and QA results.

```bash
# Generate docs/lab_report_v1.yaml
node scripts/generate_lab_report.cjs
```

See [docs/lab_report_v1.yaml](docs/lab_report_v1.yaml) for the latest certified build metrics.

### 3. Exports (Phase S5)

- **JSON Export**: Click the 💾 icon in the demo to save the full run state (timeline + patterns).
- **Narratives**: Click 📝 to get a text summary of the session dynamics.
- **Catalog**: Use the "Catalog" button to switch physics profiles (e.g., Autism, ADHD) and lens frames.

> [!IMPORTANT]
> **Codebase Status (S7 migration complete)**
>
> - **Sources**: `src/` is the only place for edits. Run `npm run build:all` to update both the site and the standalone engine bundle.
> - **Runtime engine bundle**: `dist/mgs-engine.js` (built from `src/engine.ts` via `vite.engine.config.ts`) is the production source of truth consumed by the QA / regression harnesses.
> - **Legacy file**: root `mgs-engine.js` is deprecated and kept only for historical comparison and the small number of legacy harness tests still pinned to its flat-script form. Slated for removal in S8 once the test framework migration lands.
> - **Type strictness**: the modular library (`simulation.ts`, `physics.ts`, `ambient.ts`, `patterns.ts`, `materials.ts`, `visualization.ts`, etc.) is checked under `tsconfig.strict.json`. The legacy `engine.ts` / `lab_view.ts` remain on the loose tsconfig pending the Phase 3 god-file split.

## File Structure

```
.
├── src/                   # Canonical sources
│   ├── engine.ts          # Legacy port (4.4k lines, scheduled for split)
│   ├── lab_view.ts        # Lab UI controller
│   ├── simulation.ts      # New modular SimulationCore
│   ├── physics.ts         # Force calculations
│   ├── ambient.ts         # Background field engine
│   ├── patterns.ts        # PatternTracker (loops, clusters, waves)
│   ├── materials.ts       # 31 material definitions
│   ├── visualization.ts   # Canvas render pipeline
│   ├── types.ts           # Public Edge/Object/Pattern interfaces
│   └── global.d.ts        # Window typings (single source of truth)
├── dist/                  # Vite output: index.html + mgs-engine.js
├── docs/                  # PRD, agent guardrails, lab reports
├── scripts/               # Build/report tools
├── tests/                 # Node.js QA harnesses (.cjs)
├── mgs-engine.js          # DEPRECATED legacy engine (kept until S8)
└── vite.{site,engine}.config.ts
```

## Origin

MindGraphSim began as an attempt to describe one autistic sensory life in the language of physics. By stress testing on intense perception and atypical connectivity, the engine became general enough to describe many kinds of minds.

Edge-case perception exposes where models break. By starting from atypical minds, MindGraphSim is less likely to collapse back to an average user who does not exist in real life.

## License

MIT

## Authors

- EBENZ AUGUSTAVE - (concept, sensory model)
