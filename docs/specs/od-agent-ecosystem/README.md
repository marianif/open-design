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

**Live status (2026-10-13):** Tracks 0–3b ✅ (Crush adapter, `od mcp install crush`, v2-native CLI
def, OpenCode ACP transport; merged/pushed). Track 4 ✅ functionally complete — plugin tools
(`project_list`, `active_context`, `file_read`, `file_write`, `artifact_lint`), DESIGN.md context,
and an HTML design-lint hook (P0 detection) all live-verified on v2.0.26; install recipe + daemon
discovery recorded. Next: **Track 5 round trip** — live in `trackly-expense-tracker` (whose
`tokens.ts` is itself "ported 1:1 from the OpenDesign prototype", closing the loop that was
already being done by hand). M1.5 Crush live run: **parked, optional**.
