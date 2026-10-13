# Spec — OpenDesign × OpenCode / Crush ecosystem connections

| | |
|---|---|
| Feature ID | `od-agent-ecosystem` |
| Status | Active — internal-first; upstream deferred until proven |
| Date | 2026-10-13 |
| Repos | local `~/Documents/open-design` · fork `marianif/open-design` · upstream `nexu-io/open-design` |
| Key refs | commit `23de9270ac` (`feat(daemon): add Crush as an agent runtime`) · fork PR #1 → main `75b0c93271` · local notes `CRUSH-INTEGRATION.md` at repo root (git-excluded) |

## 1. Problem

OpenDesign (OD) deliberately does not ship its own agent — it borrows coding-agent CLIs as the
design engine. Two ecosystems we care about are only half-connected:

1. **Crush** (`charmbracelet/crush`) — the living continuation of the archived
   `opencode-ai/opencode` (Go) project we started from. Before this work, OD did not know it
   existed (0 of 27 runtime defs).
2. **OpenCode V2** (`opencode.ai`; v2.0.26 on this machine) — OD supports it, but through a
   v1-era CLI shim (`opencode run --format json` stdout scraping) that predates V2's
   client/server architecture, plugin API, and HTTP/SDK surface.

The reverse direction matters equally: agents running in terminals (Crush, OpenCode) cannot see
the live design context of an OD project.

## 2. Vision — two directions

- **Direction 1 — OD hands work TO the agent (runtime plane).** OD spawns the agent in the
  project cwd, streams its output into the design chat, watches files land, previews artifacts.
- **Direction 2 — the agent pulls design FROM OD (MCP/plugin plane).** OD's stdio MCP server
  exposes live projects (`od project list`, `od files read`); an OpenCode plugin deepens that
  with typed tools, `DESIGN.md` context injection, and design-lint hooks.

Everything else (skills bridge, CI lint, packaged builds) is a refinement of these two.

## 3. Goals / Non-goals

**Goals (internal-first):**
- G1 Crush usable as an OD engine locally — ✅ shipped (Track 1).
- G2 Crush sessions can read live OD projects (MCP; optional skills bridge).
- G3 OpenCode V2 supported properly: validated now, native server transport next.
- G4 The design→code round trip becomes **live** (not batch export): artifact → real
  components in the repo → preview back in OD.

**Non-goals (explicitly dropped):**
- NG1 Support work for the archived Go binary (`~/.opencode.json` compat installers).
- NG2 New features *for* OpenCode V1 — the existing CLI path is frozen, not removed.
- NG3 Standing skill installation into agent homes in v1 (OD's per-session staging stays).
- NG4 Upstream PR to `nexu-io/open-design` until internal use proves the value.

## 4. User stories

| ID | Story | Prio | Status |
|----|-------|------|--------|
| US-1 | As our team, we pick Crush in OD's picker and get design output with files landing in the project | P0 | ✅ runtime shipped; live run pending provider |
| US-2 | As our team, a Crush session in a repo reads live OD project files via MCP | P0 | pending — Track 2 |
| US-3 | As an OD user, OpenCode V2 runs give structured streaming, cancel, session resume | P1 | pending — Track 3 |
| US-4 | As an OpenCode user, `DESIGN.md` is auto-loaded and UI edits are linted against tokens | P1 | pending — Track 4 |
| US-5 | As a designer, I iterate on an artifact, implement in my repo, and see the real component preview in OD | P2 | pending — Track 5 |
| US-6 | As maintainers, we can open the Crush adapter as one clean upstream PR when ready | P2 | deferred by decision (D6) |

## 5. Functional requirements

### FR-1 Crush runtime — ✅ shipped
- FR-1.1 Detection: `crush` probed with `--version`; appears in picker when installed. ✅
- FR-1.2 Invocation: `crush run -q` (+ `-m <provider/model>` when non-default); prompt via stdin. ✅
- FR-1.3 Output: plain-text streaming; file writes land in cwd and flow through OD's watcher. ✅
- FR-1.4 No permission-bypass flag: non-interactive mode auto-approves; `--yolo` is root-TUI only. ✅
- FR-1.5 Model hints: `default` + 4 curated Catwalk ids; anything else via custom input. ✅
- FR-1.6 No resume transport / no external MCP injection in v1 (daemon transcript injection covers multi-turn). ✅
- FR-1.7 Missing provider stays actionable ("No providers configured …"). ✅
- FR-1.8 Auth-attribution + analytics drift guards taught about `crush`. ✅

### FR-2 Crush ↔ OD tool plane (Track 2)
- FR-2.1 `od mcp install crush [--print|--uninstall]` merges OD's stdio MCP server into Crush's
  config (`~/.config/crush/crush.json`, root `mcp` key; exact schema verified at implementation).
- FR-2.2 Idempotent; never clobbers unrelated config; `--print` dry-run matches other targets.
- FR-2.3 Skills bridge deferred (D2); a manual copy into `~/.config/crush/skills/` is acceptable
  for internal use only.

### FR-3 OpenCode V2 (Track 3)
- FR-3.1 (3a) Validate the existing `opencode` def against v2.0.26: `run --format json`, `-s`,
  `-m`, `--variant`, `--dangerously-skip-permissions` help-probe, `models --verbose` variants,
  `OPENCODE_CONFIG_CONTENT` merge semantics.
- FR-3.2 (3b) Native transport over OpenCode's background service (HTTP API / `@opencode/client`):
  structured events, real cancel, session list/resume, model discovery from the API; the CLI
  JSONL path stays as a capability-gated fallback.
- FR-3.3 Diagnostics nudge for V1-era builds ("upgrade to V2 to unlock structured transport").

### FR-4 OpenCode plugin `plugin-open-design` (Track 4)
- FR-4.1 Tools backed by OD daemon REST: project list, file read, artifact save/lint.
- FR-4.2 `DESIGN.md` + `tokens.css` auto-context in repos that have them.
- FR-4.3 Hook: design-lint UI artifacts on edit against the active design system.
- FR-4.4 Dogfood on v2.0.26 (this machine); **V2 plugin API only**.

### FR-5 Live round trip (Track 5)
- FR-5.1 "Implement in my repo": agent = OpenCode or Crush, cwd = user repo, design system wired
  (tokens → CSS vars / Tailwind).
- FR-5.2 OD watches the repo; sidecar screenshots the running dev server; preview beside the mock.
- FR-5.3 Save-back + lint of the outcome into the OD project (memory accumulates).
- FR-5.4 Positioned against `handoff-od` (batch zip + prompt) as the **live** counterpart; reuse
  its machine-checkable adherence idea for FR-4.3.

## 6. Non-functional requirements
- NFR-1 Every shipped change keeps `pnpm guard`, daemon `typecheck`, and `tests/runtimes/` green.
- NFR-2 No upstream footprint until D6 flips; the fork carries merges.
- NFR-3 License posture: invoke, never bundle, Crush (FSL-1.1-MIT); OD is Apache-2.0.
- NFR-4 Dogfood-first: each track is exercised in the internal OD + OpenCode setup before upstreaming.
- NFR-5 Secrets stay out of files/logs; provider keys live in Crush's own config.

## 7. Acceptance scenarios

- **AS-1 (US-1):** Given a configured Crush provider, when a design brief runs with
  `agentId=crush`, then chat streams assistant text, files appear in the project, and the run
  completes without approval prompts.
- **AS-2 (US-2):** Given `od mcp install crush` ran, when a Crush session in a repo asks for OD
  files, then it reads the live project file (not an export); `--uninstall` removes the registration.
- **AS-3 (US-3):** With the V2 transport, cancel terminates a turn mid-stream and a follow-up
  resumes the same session.
- **AS-4 (US-4):** Editing a UI file in an OpenCode session triggers the design-lint hook;
  `DESIGN.md` context is present without a manual paste.
- **AS-5 (US-6):** `git checkout feat/crush-runtime && git rebase upstream/main && git push` +
  `gh pr create` yields a PR containing exactly one commit touching the 9 known files.

## 8. Decision log

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| D1 | Crush v1 = plain stream, no resume/MCP injection | smallest real step; matches deepseek/aider precedent; expansions are clean follow-ups | 2026-10-13 |
| D2 | Skills stay per-session staged; standing install deferred | OD's own design choice; less surface | 2026-10-13 |
| D3 | OpenCode: validate (3a) before transport (3b) | de-risk first; may merge upstream alone | 2026-10-13 |
| D4 | Dogfood on this machine's OpenCode v2.0.26 | fastest feedback loop | 2026-10-13 |
| D5 | Archived Go binary fully out of scope | no PRs possible, no migration path; Crush is the lineage | 2026-10-13 |
| D6 | Internal-first; upstream PR deferred until proven | user call; fork merge + local notes instead | 2026-10-13 |
| D7 | OpenCode def becomes v2-native, capability-gated on `--auto`; v1 path retained | v2 removed `--dir`/`--variant`/skip-permissions; probes in `track-3a-opencode-v2-findings.md` | 2026-10-13 |
| D8 | Keep `opencode` (CLI) + `opencode-acp` as separate defs; ACP is the recommended v2 path; unification (env-switch) deferred until Track 4 dogfooding informs it | user-verified live ACP run; two-defs precedent (`byok-opencode`); avoids engine transport-switching work | 2026-10-13 |

## 9. Open questions
- **OQ-1** Which Crush provider/key should internal runs use? (blocks AS-1)
- **OQ-2** FR-2.1: merge `crush.json` (`kind: 'json'`) or drive `crushrc`'s `mcp add`
  (`kind: 'cli'`)? Verify both at implementation.
- **OQ-3** When do we want Crush in the packaged desktop app (not just the dev web stack)?
- **OQ-4** Plugin↔daemon auth: confirm `OD_DAEMON_URL` / `OD_TOOL_TOKEN` discovery at Track 4.
