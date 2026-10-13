# Checklists — acceptance & verification

The checkmarks live here. A track is done only when its checklist is fully ticked with evidence.

## A. Reusable gates (run before any "done" claim)

```
cd ~/Documents/open-design && pnpm guard
cd ~/Documents/open-design/apps/daemon && pnpm typecheck
cd ~/Documents/open-design/apps/daemon && pnpm vitest run -c vitest.config.ts tests/runtimes/
curl -s http://127.0.0.1:<daemon-port>/api/agents | (look for the agent)   # port from `pnpm tools-dev status`
```

- [x] Gate script proven on Track 1 (all green on 2026-10-13)
- [ ] Re-run + record for every subsequent track (attach counts to the task entry)

## B. M1 — Crush adapter (done ✅)

- [x] Detected: `/api/agents` → `available: true`, `v0.98.1`, `/opt/homebrew/bin/crush`
- [x] Picker models: `default`, `anthropic/claude-sonnet-4-5-20250929`, `openai/gpt-5.2`,
      `openai/gpt-5.2-codex`, `zhipu/glm-5.3` (+ custom input)
- [x] `buildArgs` never embeds the prompt; no resume/MCP flags (unit-tested)
- [x] Drift guards green: auth attribution + analytics enum (contracts 738/738)
- [x] Full suite green: 85/85 files, 1548 passed, 2 skipped
- [x] `pnpm guard` green · daemon `typecheck` green
- [x] Merged: local `main` ff→`23de9270ac`; fork PR #1 merged → `75b0c93271`
- [x] Notes file present: `CRUSH-INTEGRATION.md` (git-excluded) · spec set in plan dir

## C. M1.5 — Crush live run (OPTIONAL — parked 2026-10-13; the pipeline runs on OpenCode)

- [ ] Crush provider configured (OQ-1 resolved; provider: ______ )
- [ ] `pnpm tools-dev start web` → status shows daemon + web
- [ ] Crush appears in the picker (28 agents total)
- [ ] A brief runs with Crush as the engine:
  - [ ] assistant text streams into chat
  - [ ] written files appear in the project (watcher)
  - [ ] no approval prompt / hang
  - [ ] run completes with terminal status
- [ ] Outcome recorded (run screenshot or file list) — AS-1 ✅

## D. M2 — `od mcp install crush` (Track 2)

- [x] `od mcp install crush --print` shows the exact merge plan (live daemon launch spec)
- [x] Real install merges Crush config without clobbering existing keys (fresh file created correctly)
- [x] `od mcp install crush --uninstall` removes exactly what it added (clean preview; planner tests)
- [x] Idempotent: running twice changes nothing (identical md5)
- [x] Tests + gates green (28/28 affected files; daemon typecheck)
- [ ] `crush` session can `od project list` / `od files read` against a live OD project — AS-2
      (blocked on the Crush provider, same as M1.5)

## E. M3a — OpenCode V2 validation

- [x] v2.0.26 probe matrix run and recorded → `track-3a-opencode-v2-findings.md`
- [x] Def patches landed with tests (`cb6c2aa85f`: `--auto`, no `--dir` on v2, `#variant` folding;
      81/81 affected tests, typecheck green)
- [ ] Existing OpenCode runs still work end-to-end on V2 — argv is now v2-native and
      unit-verified; live check blocked on the account (402 insufficient funds) or another provider

## F. M3b — OpenCode V2 native transport

- [x] Design note recorded → `track-3b-opencode-transport-design.md` (ACP-first recommendation)
- [x] `opencode-acp` def lands with tests (`detectAcpModels` from `session/new` configOptions;
      detection live-verified: 80 models, `opencode/*` free models first)
- [x] Live ACP run on a free model — **user-verified in the UI (2026-10-13)**
- [ ] Cancel works mid-turn in the UI
- [ ] Follow-up turn resumes the same ACP session (`loadSession`)
- [ ] Headless permission posture verified (ACP requests auto-answered or graceful)
- [ ] CLI `opencode` def still functions (v1-era / shim-less builds)
- [x] Default-transport decision recorded — D8: two defs retained for now (see `spec.md` §8)

## G. M4 — OpenCode plugin

- [x] Plugin loads in v2.0.26 — verified via the directory recipe (`.opencode/plugins/<name>/index.ts`
      + `opencode reload`); config `plugins[]` absolute paths did not load (recorded in the plugin README)
- [~] Tools: `od_project_list` / `od_active_context` / `od_file_read` **live-verified end-to-end**
      (model called the tool in-session; output = live daemon JSON); artifact save/lint + lint hook next
- [~] DESIGN.md auto-context **live-verified** (fixture brand color answered with no file read);
      tokens.css + active-OD-project enrichment next
- [ ] Lint hook fires on a UI-file edit — AS-4
- [~] Daemon discovery: plugin options → `OD_DAEMON_URL` → `~/.config/opencode/open-design.json` →
      default; token auth for non-dev daemons still open (OQ-4)

## H. M5 — Live round trip

- [ ] "Implement in my repo" produces real components with design tokens wired
- [ ] OD preview shows the running app (sidecar screenshot) beside the mock
- [ ] Artifact save-back + lint appear in the project conversation
- [ ] Demo recorded; positioned against `handoff-od` batch flow

## I. Upstream readiness (only when D6 flips)

- [ ] Internal usage has run for a meaningful window with no regressions
- [ ] `git checkout feat/crush-runtime && git fetch upstream && git rebase upstream/main` → 1 commit
- [ ] Gates re-run green on the rebased commit
- [ ] `git push -u origin feat/crush-runtime`
- [ ] `gh pr create -R nexu-io/open-design --head marianif:feat/crush-runtime` with the commit
      message as body (Why / What users see / Surface area)
- [ ] PR opened — **note the number here:** ______
