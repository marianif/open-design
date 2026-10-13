# OpenDesign × OpenCode / Crush — spec set

**North star:** make OpenDesign ↔ OpenCode(V2) ↔ Crush a real, bidirectional ecosystem
connection — OD hands work *to* the agents (runtime plane); the agents pull live design
context *from* OD (MCP/plugin plane). Internal-first; an upstream PR only if it proves out.

| File | Role |
|---|---|
| `spec.md` | What & why — vision, user stories, requirements, acceptance scenarios, decisions |
| `plan.md` | How — architecture, repo seams, per-track technical approach, risks |
| `tasks.md` | Ordered work with statuses, dependencies, evidence |
| `checklist.md` | Acceptance & verification checklists (the checkmarks) |
| `track-3a-opencode-v2-findings.md` | Validation evidence — OpenCode v2.0.26 matrix, shim note, open items |
| `track-3b-opencode-transport-design.md` | Transport design — ACP-first plan, evidence, phases, risks |

**Live status (2026-10-13):** Tracks 0–3b ✅ — Crush adapter, `od mcp install crush`, v2-native
OpenCode CLI def, OpenCode ACP transport; all merged/pushed. Track 4 core ✅ dogfooded — plugin
tools + DESIGN.md context live on v2.0.26. Next: Track 4 remainder (artifact tools, lint hook) →
Track 5 round trip, **engine = OpenCode (free models)**. M1.5 Crush live run: **parked, optional**
(needs a provider account decision, not required for the pipeline).
