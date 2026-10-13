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

## C. M1.5 — First internal live run (blocking)

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

- [ ] v2.0.26 probe matrix run and recorded (flag/format/cmd → works | changed | gone)
- [ ] Any required def patches landed with tests
- [ ] Existing OpenCode runs still work end-to-end on V2

## F. M3b — OpenCode V2 native transport

- [ ] Service discovery/auth works from the daemon (no manual env when possible)
- [ ] Structured events map to: text deltas, thinking, tool call, file write, usage, done
- [ ] Cancel terminates mid-turn within ~1s
- [ ] Follow-up resumes the same session (no transcript re-send)
- [ ] Model list comes from the live API (15s `models --verbose` scrape avoided)
- [ ] V1 fallback still functions behind a capability gate
- [ ] `tests/runtimes/` + new transport tests green; guard/typecheck green
- [ ] Parity demo recorded (structured tool rows + cancel) — AS-3

## G. M4 — OpenCode plugin

- [ ] Plugin loads in v2.0.26 from the local install path
- [ ] Tools: project list / file read / artifact save / lint — each callable in-session
- [ ] DESIGN.md + tokens.css context present automatically (no manual paste)
- [ ] Lint hook fires on a UI-file edit — AS-4
- [ ] No secrets in logs; daemon auth handled via env discovery (OQ-4)

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
