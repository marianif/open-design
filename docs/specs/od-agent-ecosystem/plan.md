# Plan — technical approach

## 1. Architecture (as built + planned)

```
Direction 1 — OD → agent (runtime plane)
┌──────────────────────────── OpenDesign daemon (Node/Express, apps/daemon) ─────────────────────────┐
│  runtimes/defs/<agent>.ts   →  detection (version probe) → spawn pipeline (server.ts)              │
│  streamFormat: 'plain' | 'json-event-stream' | 'acp-json-rpc' | … → UI events (text/tool/file/done)│
└──────────────┬──────────────────────────────────────────────────────────────────────────────────────┘
               │ spawn(cwd = project)
   ┌───────────┴────────────┐        ┌─────────────────────┐
   │ crush run -q (stdin)   │        │ opencode run --format json │  ← today (v1-era shim)
   │ plain stdout + watcher │        │ …planned: OpenCode V2 background service / @opencode/client
   └────────────────────────┘        └─────────────────────┘

Direction 2 — agent → OD (MCP / plugin plane)
Crush / OpenCode ──stdio MCP──▶ od mcp serve (projects, files, skills, plugins — read-only by default)
OpenCode V2 plugin (planned): typed tools over daemon REST + DESIGN.md context injection + lint hook
```

## 2. Repo seams (where code lands)

| Piece | Location | Kind |
|---|---|---|
| Crush adapter (done) | `apps/daemon/src/runtimes/defs/crush.ts` + `registry.ts` + `metadata.ts` | 1 def file + 2 lines |
| Auth allowlist (done) | `apps/daemon/src/runtimes/auth.ts` → `OWN_AGENT_COMMAND_NAMES` | literal list |
| Analytics enum (done) | `packages/contracts/src/analytics/events/{shared-enums,mappers}.ts` | additive union + mapper |
| `od mcp install` targets | `apps/daemon/src/mcp-agent-install.ts` (`AGENT_SLUGS`, per-slug plan; executor in `cli.ts`) | one slug + one plan fn |
| OpenCode V2 transport (planned) | new `apps/daemon/src/agent-protocol/opencode/` + new `streamFormat` value + `server.ts` dispatch | new engine file (contract's "new wire format" case) |
| OpenCode plugin (planned) | separate npm package (V2 plugin API), no OD repo change required | out-of-repo |
| Artifact lint/save | OD daemon REST `/api/artifacts/{save,lint}` | existing |
| Round-trip preview | Electron sidecar IPC (`EVAL`/`SCREENSHOT`) + project watcher | existing |

## 3. Per-track technical notes

### T1.5 — First live run (blocking, internal only)
- Configure a Crush provider: `crush` TUI once (Hyper free tier fastest) **or** a key in
  `~/.config/crush/crushrc`. No OD code involved.
- Then: dev stack → pick **Crush** → run a small brief → verify stream + files + no approval hang.
- If something breaks in the spawn path, the daemon log is at
  `.tmp/tools-dev/default/logs/daemon/latest.log`.

### T2 — `od mcp install crush`
- Crush reads MCP from `crushrc` (bash builtins: `mcp add …`) **or** `crush.json` (`mcp` root key).
- Implementation: add `crush` to `AGENT_SLUGS`; likely a `kind: 'json'` plan merging
  `~/.config/crush/crush.json` with `keyPath: ['mcp']`. If the JSON schema is unstable, fall back
  to `kind: 'cli'` shelling `crush` (crushrc) — needs a non-interactive path check.
- Follow the existing `--print` / `--uninstall` conventions; add a test under
  `apps/daemon/tests/` mirroring `mcp-install-cli.test.ts`.
- Skills bridge: deferred (D2). Internal-only manual copy to `~/.config/crush/skills/` if wanted.

### T3a — OpenCode V2 validation (small)
- Check against v2.0.26 on this machine: `opencode run --format json` still exists; `-s`, `-m`,
  `--variant`; help probe for `--dangerously-skip-permissions`; `opencode models --verbose`
  variant keys; `OPENCODE_CONFIG_CONTENT` merge into V2 config (`mcp` key path).
- Patch only what moved; keep the CLI path frozen for V1 installs (perception nudge FR-3.3 optional).

### T3b — OpenCode V2 native transport (flagship)
- Transport: discover/start/auth the local background service (OpenCode's client `Service` API
  from Node, or raw HTTP + event stream from `/openapi.json`).
- Session: create → send prompt → subscribe → map to OD events (text deltas, thinking, tool
  calls, file writes, usage, done) → cancel via API → resume via stored session id.
- Permissions: OD runs headless; follow §10 posture (non-interactive/auto-approve equivalent)
  consistent with the other defs.
- Keep `opencode run --format json` as fallback when a V1 service is detected; capability-gate.
- Contract touch: likely a new `streamFormat` + `agent-protocol/opencode/` module; consider
  `firstOutputTimeoutMs`/`inactivityTimeoutMs` if the service goes quiet.

### T4 — `plugin-open-design` for OpenCode V2
- V2 plugin API only (fetch `opencode.ai/v2/docs/build/plugins` before writing code).
- Tools over OD daemon REST (localhost); auth discovery via `OD_DAEMON_URL` / `OD_TOOL_TOKEN`
  (verify, OQ-4).
- Context: inject `DESIGN.md` + `tokens.css` when present in the repo; hook UI-file edits to run
  OD's artifact lint (steal `handoff-od`'s adherence idea, made live).
- Distribution: npm package + config entry; dogfood against v2.0.26 here.

### T5 — Live round trip
- “Implement in my repo” flow: OD project (DESIGN.md + artifact) → run OpenCode/Crush with
  cwd = repo → wire tokens (CSS vars/Tailwind) → OD watcher sees files → sidecar screenshot of the
  dev server → preview beside the mock → save-back + lint.
- Batch counterpart already installed: `handoff-od` (zip + prompt, oxlint adherence config) — ours
  is the live counterpart, not a replacement.

### Backlog (post-proven)
- Upstream PR(s) from `feat/crush-runtime` (one clean commit, recipe in repo-root
  `CRUSH-INTEGRATION.md`); `od skills export --target crush|opencode`; Crush `serve`-based
  structured transport; design-lint CI (`opencode run` + OD MCP in GitHub Actions); packaged
  desktop build with the adapter.

## 4. Constraints & risks

| Risk | Mitigation |
|---|---|
| OpenCode V2 API churn | Target V2 docs only; CLI fallback stays; capability gates |
| OD upstream moves fast → rebase pain | One-commit branch; `git rebase upstream/main` is trivial |
| Crush FSL license | Invoke, never bundle; if contributing *to* Crush, follow their rules |
| Live-run cost on internal keys | Small briefs; provider stays Crush's own config |
| Dynamic dev ports | Always read `pnpm tools-dev status`; never hardcode (52875/52876 today only) |
| Spec drift | `tasks.md` + `checklist.md` updated at every milestone; memory: work_state list `od-crush-integration` |

## 5. Upstream strategy (D6)
- Everything lands in the fork + local first. Upstream PR is a deliberate later step:
  `feat/crush-runtime` stays as the head branch; recipe in `CRUSH-INTEGRATION.md`.
- PR body = commit message (`git show -s --format=%B 23de9270ac`); surface area = API/contract
  (additive analytics enum).

## 6. Environment quickref
```
Stack:    cd ~/Documents/open-design && pnpm tools-dev start web | status | stop web
Agents:   curl -s http://127.0.0.1:<daemon-port>/api/agents        # look for "id":"crush"
Gates:    pnpm guard  ·  (cd apps/daemon && pnpm typecheck)  ·  (cd apps/daemon && pnpm vitest run -c vitest.config.ts tests/runtimes/)
Crush:    v0.98.1 @ /opt/homebrew/bin/crush · provider config at ~/.config/crush/
OpenCode: v2.0.26 (dogfood target)
Defaults: repo main = 75b0c93271 (upstream 1343f374c6 + crush commit 23de9270ac)
```
