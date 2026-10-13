# Tasks — status board

Legend: `[x]` done · `[~]` doing · `[ ]` todo · `[-]` dropped
Every done task carries evidence (commit / test counts / PR / command output).

## M0 — Recon & decisions ✅
- [x] T-001 Machine & repo recon — OD clone, fork/upstream remotes, app, PR #8642 state. `2026-10-13`
- [x] T-002 Crush v0.98.1 behavior recon — stdin prompt (`MaybePrependStdin`), `--yolo` root-only,
      non-interactive auto-approve (`Permissions.AutoApproveSession`), `session list --json`,
      `crush models` = 1785 ids, empty `~/.config/crush`.
- [x] T-003 Decisions D1–D6 recorded in `spec.md` §8.
- [-] T-004 Legacy archived-binary compat — dropped by D5.

## M1 — Crush runtime adapter ✅ (Track 0 + Track 1)
- [x] T-101 `defs/crush.ts` — `run -q` + `-m`, stdin prompt, plain stream, 5 model hints,
      no resume/MCP injection. Commit `23de9270ac`.
- [x] T-102 Registry + metadata entries.
- [x] T-103 Drift guards: `OWN_AGENT_COMMAND_NAMES` += `crush`; `TrackingCliProviderId` + mapper
      + contracts test assertion.
- [x] T-104 Tests: `tests/runtimes/crush.test.ts` (7) + full suite green —
      **85/85 files, 1548 passed, 2 skipped**.
- [x] T-105 Gates: daemon `typecheck` ✅ · `pnpm guard` ✅ (x2) · contracts 738/738 ✅.
- [x] T-106 Live detection: `/api/agents` → `crush` available v0.98.1, 28 defs ✅.
- [x] T-107 Local merge: `main` ff → `23de9270ac`; fork sync + PR #1 merged → `75b0c93271`.
- [x] T-108 Local notes file `CRUSH-INTEGRATION.md` (repo root, git-excluded) + spec set (this dir).

## M1.5 — First internal live run ⏳ (blocking next step)
- [ ] T-151 Configure a Crush provider (user action; `crush` TUI once — Hyper free tier, or a key
      in `~/.config/crush/crushrc`). **OQ-1**
- [ ] T-152 Dev stack up (`pnpm tools-dev start web`) → pick **Crush** in a project.
- [ ] T-153 Run a small design brief; verify AS-1: streamed text, files land, no approval hang,
      run completes. Capture the run id / screenshot in OD.
- [ ] T-154 Record outcome here + in work_state; fix anything the live run surfaces.

## M2 — Crush ↔ OD tool plane (Track 2 / FR-2)
- [x] T-201 Decided `kind: 'json'` (**OQ-2 closed**): entry shape pinned to the published schema
      `charm.land/crush.json` → `$defs.MCPConfig` (`additionalProperties:false`); path
      `~/.config/crush/crush.json`, keyPath `['mcp']`.
- [x] T-202 Implemented the `crush` target: slug + planner case; `--print` / `--uninstall` via the
      shared executor. Commit `ef4a7b7081`.
- [x] T-203 Tests: planner plan + merge/remove preservation + CLI dry-run — 28/28 on the two affected
      files; daemon `typecheck` green.
- [~] T-204 Live install verified on this machine (file written; Crush loads it — only the expected
      provider error remains; uninstall preview clean; idempotent md5). Full AS-2 session read is
      blocked on the Crush provider (shares the M1.5 block).
- [ ] T-205 (Optional internal) manual skills copy into `~/.config/crush/skills/` — D2 scope.

## M3a — OpenCode V2 validation (FR-3.1)
- [x] T-301 Probe matrix run against v2.0.26 and recorded → `track-3a-opencode-v2-findings.md`
      (flag/format/cmd → OK | changed | gone; the local v1→v2 shim is documented there).
- [x] T-302 Def patched to be v2-native with the v1 path retained: `--auto` capability + preference,
      `--dir` skipped on v2, variant folded into `-m model#variant`. Commit `cb6c2aa85f`;
      affected tests 81/81; daemon typecheck green.
- [ ] T-303 (Optional) V1→V2 upgrade nudge diagnostic (FR-3.3).

## M3b — OpenCode V2 native transport (FR-3.2, flagship)
- [x] T-351 Design note — `track-3b-opencode-transport-design.md`. Evidence-driven pick:
      **ACP-first** (Phase 1: `opencode-acp` def reusing `acp-json-rpc`), CLI def retained as
      fallback, HTTP `serve` deferred (experimental surface).
- [x] T-352 Phase 1: `opencode-acp` def + registry + metadata + tests (commit `cdb04ddf74`);
      drift guards registered (auth allowlist + `opencode_acp` analytics id); detection
      live-verified (80 models, `opencode/*` first). Docs: `0607472ecc`.
- [ ] T-353 Validate ACP live on a free model: model picker from `session/new`, cancel, follow-up
      resume (`loadSession`), headless permission posture.
- [ ] T-354 Phase 2: default-transport decision for v2 builds (env switch vs two defs).
- [ ] T-355 Phase 3 (optional): HTTP `serve` transport if ACP gaps appear.

## M4 — `plugin-open-design` for OpenCode V2 (FR-4)
- [ ] T-401 Fetch V2 plugin docs; scaffold package; wire local install for dogfood.
- [ ] T-402 Typed tools: projects list, file read, artifact save/lint (daemon REST; auth **OQ-4**).
- [ ] T-403 DESIGN.md + tokens.css auto-context.
- [ ] T-404 Lint hook on UI-file edits (adherence idea from `handoff-od`, made live).
- [ ] T-405 Dogfood on v2.0.26: AS-4 passes in a real repo session.

## M5 — Live round trip (Track 5 / FR-5)
- [ ] T-501 "Implement in my repo" flow end-to-end (OpenCode/Crush cwd = repo, tokens wired).
- [ ] T-502 Watcher + sidecar screenshot of dev server → preview beside mock.
- [ ] T-503 Save-back + lint into the OD project; memory accumulates.
- [ ] T-504 Demo recording (the showcase artifact).

## Backlog (post-proven, decision-gated)
- [ ] T-901 Upstream PR to `nexu-io/open-design` from `feat/crush-runtime` (D6 gate; recipe in
      `CRUSH-INTEGRATION.md`).
- [ ] T-902 `od skills export --target crush|opencode`.
- [ ] T-903 Crush `serve` structured transport (tool-granular events).
- [ ] T-904 Design-lint CI (`opencode run` + OD MCP in GitHub Actions).
- [ ] T-905 Packaged desktop build with the adapter in the daily app (**OQ-3**).
