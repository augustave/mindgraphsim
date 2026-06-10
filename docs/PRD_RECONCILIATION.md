# PRD Reconciliation — v0.1 vision vs shipped engine

This document reconciles the original **v0.1 "Cognitive Physics Demonstrator" PRD** against the code that actually shipped (product version is now `0.8.0`, set in `package.json`; `docs/PRD.yaml` carries its own doc-revision `0.4`). It exists because the v0.1 PRD is substantially inaccurate as a description of the system.

> **Status:** §6 (profile-id drift) and §7 (version sprawl) below were **resolved** — profile ids in `docs/PRD.yaml` now match `src/profiles.ts`, and product version is unified at `0.8.0`. They are retained here as a record of what was fixed.

Code references below point at `src/` in this repo.

---

## TL;DR

The shipped engine is **well past v0.1** in capability and **diverged from v0.1 in architecture**. Three classes of drift:

1. **Stack** — v0.1 specified React + D3/p5 + Zustand. Shipped is **vanilla TypeScript + HTML5 Canvas + Vite**. No React, D3, p5, Zustand, or Matter.js anywhere.
2. **Non-goals breached (intentionally)** — v0.1 listed "no LLM, no agents, no memory persistence." The shipped scenes contain LLM/RLAIF nodes, patterns are agentized (energy/age/lifetime), and `Recorder`/`ReplaySystem` provide in-session memory + replay.
3. **Scope vastly exceeded** — v0.1 had 6 MVP features and one travel-planning demo. Shipped has 6 pattern types, 5 cognitive profiles, 6 interpretive frames, 2 physics models, 3 regimes, timeline replay, and multi-format export.

---

## 1. Architecture

| v0.1 PRD | Shipped reality | Source |
|---|---|---|
| React | None — vanilla TS modules | `src/lab_view.ts`, `index.html` |
| D3 Force / p5.js | Hand-rolled physics + HTML5 Canvas | `src/physics.ts`, `src/visualization.ts`, `src/engine.ts` |
| Zustand state | Plain module-level `state` object | `src/engine.ts` (`export let state`) |
| Future: Matter.js | Not used; custom integrator | `src/physics.ts` |
| TypeScript + Vite | ✅ accurate | `tsconfig.json`, `vite.*.config.ts` |

**Action:** the v0.1 "Technical Architecture" section is wrong and should be replaced, not patched.

---

## 2. Non-goals that shipped anyway

v0.1 explicitly deferred these to "future phases." They are present today:

| v0.1 non-goal | Shipped as | Source |
|---|---|---|
| AI agents | LLM (Gemma 3n) node + RLAIF Loop node in the self-model scene | `conflict_resolution` scene, `src/engine.ts` |
| Memory persistence across sessions | `Recorder` buffer + `ReplaySystem` (record, scrub, replay) | `src/engine.ts`, exposed on `window.MGS` |
| LLM reasoning | Referenced as a modeled node; methodology/reward modules | `src/methodology.ts`, `src/reward.ts` |
| (implicit) static patterns | Patterns are agentized — carry `energy`, `age`, `lifetime_steps` and feed back into physics | `applyPatternInfluence`, `src/engine.ts` |

This is not a defect — the product grew past its own MVP fence. But the non-goals list now reads as false and should be dropped or reframed as "shipped in S2–S5."

---

## 3. Node / Edge model

v0.1 node = `{ name, mass, energy, conductivity, decay, position, velocity, category }`.

Shipped node is richer (`src/types.ts`, `src/materials.ts`):

- `material_type` — one of **31** materials across metal / mineral / bio (`src/materials.ts`)
- `charge`, `sensory_profile` (sound/color/texture/temperature/weight)
- 12-dimensional feature vector (novelty, utility, connectivity, stability + 8 extended)
- `role` ∈ {Anchor, Bridge, Explorer, Sentinel} with distinct physics
- `activation`, `stress`, `overloaded`, `overloadEnergy`

v0.1's `conductivity` / `momentum` framing did not survive literally; the shipped vocabulary is activation-spread + role-based mechanics.

---

## 4. Feature delta

All six v0.1 MVP features shipped, plus a large surplus:

| v0.1 MVP feature | Status | Shipped superset |
|---|---|---|
| Node creation (CRUD) | ✅ | + 31 materials, roles, scenes |
| Physics simulation | ✅ | gravity, repulsion, drag, spring tension, collision, 3 regimes |
| Attention injection | ✅ | shift-click boost, double-click stress test |
| Constraint injection | ✅ | live profile/frame/model switching |
| Memory decay | ✅ | activation decay + sensory decay + recovery |
| Cluster detection | ✅ | **6** pattern types: loop (oscillator), wave, cluster, membrane, bridge, levin |

Surplus with no v0.1 equivalent: timeline replay, narrative export, JSON/PNG export, Safety HUD, 5 profiles, 6 interpretive frames, 2 physics models (`baseline`, `pattern_coupled`), pattern coalescing.

---

## 5. Demo scenario drift

- **v0.1:** travel-planning demo (Flights / Budget / Hotel / …).
- **Shipped scenes** (`src/engine.ts` `SCENES`): `blank`, `single_core_two_anchors`, `research_session`, `conflict_resolution`, `brainstorm_mesh`. The `conflict_resolution` scene is a **self-model** of MindGraphSim's own architecture (Concept Forge, Methodology Decider, RLAIF Loop, LLM, Feature Vector…). No travel demo exists.

---

## 6. Profile-id drift — RESOLVED

`docs/PRD.yaml` (v0.4) previously disagreed with the code on profile ids. Code is the source of truth, so `PRD.yaml` was updated to match `src/profiles.ts`:

| Was (`docs/PRD.yaml`) | Now — matches `src/profiles.ts` |
|---|---|
| `general_mind` (default) | `open_neutral` (default) |
| — (missing) | `autistic_sensory_sheet` (added) |
| `autistic_intensity` | `autistic_intensity` |
| `adhd_scatter_focus` | `adhd_scatter_focus` |
| `meditative_slow_field` | `meditative_slow_field` |

Default profile id is now `open_neutral` in both. Marketing label "General Cognitive Field" retained on the `open_neutral` entry.

---

## 7. Version sprawl — RESOLVED

Product version is unified at **`0.8.0`**, authoritative in `package.json` and injected into every exported run as `mgs_version` via the Vite `define` in `vite.{site,engine}.config.ts`.

| File | Was | Now |
|---|---|---|
| `package.json` | `0.7.0` | `0.8.0` |
| `src/index.ts` banner | `v0.7` | `v0.8` |
| `README.md` | `v0.8 S2` | `v0.8 S2` (unchanged; the `S2` suffix is a stage label, not semver) |
| QA harness `engine_version` | `v0.8-S2.5` | unchanged (stage-tagged QA label) |
| `docs/PRD.yaml` `manual_metadata.version` | `0.4` | unchanged — this is the **doc's own revision**, not the product version |

Rule going forward: semantic product version lives only in `package.json`; "S-stage" strings are descriptive labels, not version numbers.

---

## Recommendation

1. **Retire the v0.1 markdown PRD.** It no longer describes the product. Keep it only as a historical artifact, clearly marked `SUPERSEDED`.
2. **Promote `docs/PRD.yaml` (v0.4)** as the canonical product/positioning doc — it already matches the shipped messaging and profile intent (modulo the `general_mind`/`open_neutral` id fix).
3. **Fix profile-id drift** (§6) and **collapse version sprawl** to `package.json` (§7).
4. Treat this file as the migration note bridging the two.
