# Track 3b — OpenCode native transport: design note (T-351)

Status: **proposal + Phase 1 in implementation** · 2026-10-13 · Target: OpenCode v2.0.26

## Goal

Give OpenDesign a **structured** OpenCode transport — sessions, resume, cancel, model
discovery + selection, images — replacing the CLI-scrape flow as the preferred path, while
keeping the (now v2-native) CLI `opencode` def as the fallback for v1-era or shim-less builds.

## Evidence (all probed live on this machine, v2.0.26)

1. **CLI JSON frames** (`opencode run --format json`, tool-using turn):
   `step_start` / `text` / `tool_use` (with `part.tool` + `part.callID`) / `step_finish`,
   every frame carrying `sessionID`. **OD's existing `opencode` handler in
   `json-event-stream.ts` already parses these shapes** (step_start ~L226, tool_use ~L246,
   step_finish ~L272) — no parser patch needed for v2's CLI path.
2. **`opencode acp` handshake** (initialize → result):
   `loadSession: true`; session capabilities `list`, `resume`, `close`, `delete`, `fork`;
   prompt `image: true` + `embeddedContext: true`; MCP `http: true, sse: false`;
   `_meta["opencode/child-session-updates"]: true`; auth method `opencode-login`.
3. **`session/new` response exposes a `model` config select** — `configOptions[0]` with
   `currentValue` + ~47 labeled options — exactly the shape OD's `detectAcpModels` consumes
   (`MODEL_CONFIG_OPTION_IDS` includes `model`), with selection via `session/set_model`.
4. **`opencode serve`** exposes a 118-path HTTP API (`/api/session/{id}/prompt`, `/api/event`,
   `/api/session/{id}/interrupt`, permission-reply, `/api/model`, …) — but the OpenAPI
   self-describes as *"Experimental HttpApi surface for selected instance routes."*
5. **Free models**: the `opencode` provider (distinct from the empty `opencode-go` wallet)
   runs `opencode/cat-jam-free` etc. live → every option below is testable today.

## Options

| | A. ACP def (`opencode acp`) | B. HTTP `serve` transport | C. CLI JSON (current) |
|---|---|---|---|
| Engine code | none new (shared `acp-json-rpc`) | new `agent-protocol/opencode/` + streamFormat | none |
| Sessions | new/load/list/resume/fork ✅ | ✅ | capture-id, no list |
| Cancel | ✅ ACP cancel | ✅ `interrupt` endpoint | process kill |
| Models | ✅ `session/new` configOptions | ✅ `/api/model` | CLI list, no variant metadata |
| Permissions | ✅ ACP permission requests | ✅ reply endpoint | auto (v2 `--auto`) |
| Images | ✅ `promptCapabilities.image` | ✅ | `--file` |
| MCP | http only (`sse:false`; stdio unadvertised) | config-dependent | n/a (own config) |
| Stability | ACP is a stable cross-agent protocol | **Experimental** surface | stable |
| Effort | ~1 def + tests | 1–2 weeks | done (3a) |

## Recommendation — ACP-first, phased

**Phase 1 (now): add an `opencode-acp` runtime def.** Distinct id keeps the proven CLI def
intact (precedent: `byok-opencode`; the tiny `trae-cli.ts` is the template). Shape:
`bin: 'opencode'`, `buildArgs: ['acp']`, `streamFormat: 'acp-json-rpc'`, models via
`detectAcpModels({ args: ['acp'] })`, `resumesSessionViaAcpLoad: true`. No engine changes.

**Phase 2 (after live proof): pick the default for v2 builds** — either merge transports into
one def with an env switch (precedent: `OD_CODEX_TRANSPORT`) or keep two defs.

**Phase 3 (optional): HTTP `serve` transport** only if ACP gaps appear (e.g., UI-parity
features). Treat as experimental until upstream un-gates it.

## Implementation sketch (Phase 1)

- `apps/daemon/src/runtimes/defs/opencode-acp.ts` — mirror `trae-cli.ts`:
  `fetchModels → detectAcpModels`, `fallbackModels: [DEFAULT_MODEL_OPTION]`, `buildArgs: ['acp']`,
  `streamFormat: 'acp-json-rpc'`, `resumesSessionViaAcpLoad: true`. **Deliberately omits**
  `externalMcpInjection` (OpenCode ACP does not advertise stdio MCP; the proven tool-plane path
  stays `od mcp install opencode`, which writes its own config) and `mcpDiscovery` until verified.
- Registry + metadata entries; per-def test; detect `opencode` + `opencode-acp` together.

## Acceptance (Phase 1)

- [ ] `/api/agents` shows `opencode-acp` available with the live model list from `session/new`.
- [ ] An OD run on `opencode/cat-jam-free` streams structured events and completes.
- [ ] Cancel mid-turn works; a follow-up turn resumes the same ACP session (`loadSession`).
- [ ] CLI `opencode` def still works (v1-era and shim-less environments).

## Risks / open questions

- **Headless permissions**: ACP `session/request_permission` needs a client answer; verify the
  shared ACP path auto-answers (or add the posture) before calling Phase 1 done.
- **`_meta["opencode/child-session-updates"]`**: child-session frames must be parsed or
  suppressed (the generic ACP path ignores unknown `_meta`; verify no stray rows).
- **stdio MCP not injectable via ACP** → keep `od mcp install opencode` for the tool plane.
- **Auth**: ACP advertises `opencode-login`; CLI-owned, like every other agent.
- **Model variant grammar**: ACP model values carry no `#variant` suffix (unlike the v2 CLI
  `-m` grammar); no mapping needed for the default set, revisit if variants appear.
