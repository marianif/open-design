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
