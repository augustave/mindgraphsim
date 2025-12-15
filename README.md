# MindGraphSim v0.8 S2

**A simulation engine for how ideas move.**

MindGraphSim is a cognitive dynamics engine that models attention, memory, and emotion as one continuous field. It lets you observe and manipulate the physics of thought: how concepts attract, repel, merge, fracture, and form stable patterns.

Ideas are treated as physical objects moving in a shared space. Each has properties like mass, material type, charge, reach, and sensory texture. These objects interact through forces representing attention, attraction, repulsion, overload, and fatigue.

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

Open `dist/index.html` in any modern browser. No build steps required.

For development, use `npm run dev` to start the Vite server.

## Development & Analysis

This project uses a single-file engine architecture (`mgs-engine.js`) for portability and transparency.

### 1. Verification (QA)

Run the automated test harnesses to verify physics stability and regression safety.

```bash
# S2 QA Harness: Regression testing against density/pattern thresholds
node tests/generate_qa_report.cjs

# S3 Model Comparison: Selecting best physics model (Baseline vs Pattern Coupled)
node tests/generate_s3_model_comparison_report.cjs
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
> [!IMPORTANT]
> **Codebase Status (S7 Migration Complete)**
>
> - **Runtime Engine**: `dist/mgs-engine.js` is the **Production Source of Truth**. All QA and regression tests target this file.
> - **Development Source**: `src/` is the **Only** place for edits. Run `npm run build` to update the engine.
> - **Legacy File**: `mgs-engine.js` (root) is **DEPRECATED**. Do not edit it. It is kept only for historical comparison until S8.
> - **Tests**: All tests correctly verify `dist/mgs-engine.js`.

## File Structure

```
.
├── dist/                 # Release bundle
│   ├── index.html
│   └── mgs-engine.js
├── docs/                 # Lab reports and specs
├── scripts/              # Build/Report tools
├── tests/                # QA Harnesses (Node.js)
├── mgs-engine.js         # Core Physics Engine (~4k lines)
└── src/lab_view.ts       # S2 Lab UI entry (uses index.html)
```

## Origin

MindGraphSim began as an attempt to describe one autistic sensory life in the language of physics. By stress testing on intense perception and atypical connectivity, the engine became general enough to describe many kinds of minds.

Edge-case perception exposes where models break. By starting from atypical minds, MindGraphSim is less likely to collapse back to an average user who does not exist in real life.

## License

MIT

## Authors

- Tao Conrad (concept, sensory model)
