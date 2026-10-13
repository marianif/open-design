# Track 3a — OpenCode v2.0.26 validation matrix

Date: 2026-10-13 · Target: `opencode v2.0.26` (real binary), probes from this machine.

## Environment note: the local v1→v2 shim

`~/.local/bin/opencode` on this machine is a **v1→v2 compatibility shim** (not upstream code).
Its header says it exists "so v1-era integrations (e.g. Open Design 0.24.x) keep working with a
v2 install". It translates exactly the v1 surfaces OD rendered:

| v1 surface | Shim translation |
|---|---|
| `--dir <path>` | chdir before exec (v2 uses the process cwd) |
| `--variant <v>` | folded into `-m provider/model#variant` |
| `--dangerously-skip-permissions` | `--auto` |
| `models --verbose` | `--verbose` stripped (v2 has no such flag) |
| `export <id>` | `session export <id>` |
| `--pure` | dropped |

The patch in this track makes OD's `opencode` def **v2-native**, so the shim is no longer
required *for OD* (it remains useful for other v1-era tools on the machine).

## Matrix

| # | Surface | OD def assumed (v1) | v2.0.26 reality (probed) | Verdict |
|---|---------|---------------------|--------------------------|---------|
| 1 | binary | `opencode-cli` primary, `opencode` fallback | `opencode-cli` absent; `opencode` v2.0.26 | OK (fallback resolves) |
| 2 | run | `run --format json`, prompt via stdin | ✅ exists; JSON stream carries `sessionID` (`ses_…`), even on error frames | OK |
| 3 | resume | `-s` continues an existing session; capture-style id | `-s` continues **or creates** — "Session ID to continue, or to create if it does not exist" | OK; possible 3b simplification |
| 4 | model | `-m provider/model` | `-m provider/model#variant` (variant folded into the id) | Patched |
| 5 | variant | `--variant` flag + `models --verbose` metadata | flag gone; **no variant metadata via CLI** | Patched (fold `#`); v1 metadata path retained |
| 6 | permissions | `--dangerously-skip-permissions` (help probe) | renamed to **`--auto`** | Patched (probe + prefer `--auto`) |
| 7 | workspace | `--dir <cwd>` unconditional | `--dir` gone; **cwd is the project** | Patched (skip `--dir` on v2) |
| 8 | models | `models --verbose` | `--verbose` gone; plain list | Degrades to fallbackModels on a shim-less v2; 3b replaces discovery via the server API |
| 9 | MCP config | installer emits legacy `mcp.<name>` | v2's own `mcp add` writes `mcp.servers.<name>`; **legacy `mcp.<name>` is still read on v2** (this machine's global config: `claude-mem`/`revenuecat` connected) | Keep legacy shape (v1+v2 compatible) |
| 10 | account | — | every run: `provider.quota 402 Insufficient account funds` | Environment: top up `opencode-go` or select another provider before live OpenCode demos |

## Code changes (this track)
- `opencode-permissions.ts` — `OPENCODE_AUTO_APPROVE_FLAG` capability + `isOpenCodeV2()`;
  permission bypass prefers `--auto`; `appendOpenCodeWorkspaceDir` takes the agent id and skips
  `--dir` on v2. (Also serves `byok-opencode` through the shared capability map.)
- `defs/opencode.ts` — v2 folds reasoning into `-m model#variant`; `--variant` stays v1-only.
- Tests: `agent-args.test.ts` (v2 argv matrix), `byok-opencode.test.ts` (capability + `--auto`).

## Open items → 3b
- Server/API transport replaces stream scraping + CLI model discovery (and can supply variants).
- Re-validate MCP pickup of the installed entry through a real OD→OpenCode run once the account
  has funds (or another provider is selected).

## Addendum (same day, post-3a)

- **Live runs unblocked without funds**: the `opencode` provider (distinct from the empty
  `opencode-go` wallet) serves free models — `opencode run -m opencode/cat-jam-free --format json`
  completed with `{"type":"text","text":"OK",…}`. That is the live validation path for OpenCode.
- **V2 CLI frames parse with the existing handler**: a tool-using run emitted `step_start`,
  `tool_use` (with `part.tool` + `part.callID`), `step_finish`, `text` — exactly the shapes
  `json-event-stream.ts`'s opencode handler already consumes (no parser patch needed).
- **ACP + HTTP surfaces discovered** — see `track-3b-opencode-transport-design.md`:
  `opencode acp` handshake advertises loadSession + session list/resume/close/delete/fork +
  images + embedded context + MCP-http; `session/new` returns the full model select;
  `opencode serve` exposes a 118-path (self-described *experimental*) HTTP API.

## Addendum II — v2 workspace pinning (PWD), same day

Row 7's verdict was incomplete. v2 dropped `--dir`, but it did **not** fall back to the
spawn cwd: a non-interactive run resolves its workspace as
`options.root ?? process.env.PWD ?? process.cwd()` and `chdir`s there **before any model
call**. Node's `spawn({ cwd })` never updates `PWD`, so every daemon-spawned v2 run adopted
the daemon's launch directory — the same silent wrong-workspace / `no_artifact` class
`--dir` used to prevent on v1.

Verified live on **v2.0.26** (not just the reviewer's v2.0.18) with the real binary:

```bash
$ cd /tmp/od-pwd-probe/cwd
$ env PWD=/tmp/od-pwd-probe/does-not-exist ~/.opencode/bin/opencode run --format json ...
{"type":"error","error":{"message":"Failed to change directory to /tmp/od-pwd-probe/does-not-exist"}}
```

Fix (commit `36777b9f52`, branch `feat/opencode-v2-native-followups`):

- `pinOpenCodeWorkspaceEnv(env, cwd, agentId)` — sets `env.PWD` only when the `--auto`
  probe detected v2 and `cwd` is non-empty; v1 keeps `--dir`; unwarmed stays untouched.
- Wired at the three spawn sites: chat spawn (`server.ts`), connection test
  (`connectionTest.ts`), memory extractor (`memory-llm.ts`). `byok-opencode` now shares
  `appendOpenCodeWorkspaceDir` instead of its own unconditional `--dir` block.
- Side surfaces verified on v2.0.26 while here: `--pure` is gone from `run` (connection
  tests now skip it on v2; `--title` still exists); child evidence reads
  `opencode session export <id> --sanitize` (`session export` confirmed, no `--pure`).
- Evidence: 90 test files / 1569 passed (runtimes + memory/session + connection routes).

Upstream context (2026-10-13): #8313, #8523, #8612 and #8699 report this regression; PRs
#8479 and #8592 are open with `CHANGES_REQUESTED`, and #8479's blocker is exactly this PWD
pin (reviewer reproduction on v2.0.18). Variant metadata remains the one open surface
(v2 has no `models --verbose`; `~/.cache/opencode/models.json` carries variants, but it is
an internal cache, not a CLI contract).
