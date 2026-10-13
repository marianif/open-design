import { detectAcpModels, DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef } from '../types.js';

// OpenCode (ACP) — drives `opencode acp`, the V2 ACP server, through the
// shared `acp-json-rpc` transport instead of the CLI's stdout JSON.
//
// Probed live against v2.0.26 (see
// docs/specs/od-agent-ecosystem/track-3b-opencode-transport-design.md):
// the handshake advertises loadSession + session list/resume/close/delete/
// fork, image + embedded-context prompts, and `session/new` returns a full
// `model` config option that `detectAcpModels` consumes directly. This is
// the structured transport — sessions, resume, cancel — without a single
// line of new engine code.
//
// V1-era builds do not ship `acp`, so this def is v2-only by construction;
// the CLI `opencode` def remains the fallback for v1 installs and
// shim-less environments. `externalMcpInjection` is deliberately omitted:
// OpenCode's ACP advertises only HTTP MCP (no stdio), so the tool plane
// stays with `od mcp install opencode`, which writes OpenCode's own config.
export const opencodeAcpAgentDef = {
    id: 'opencode-acp',
    name: 'OpenCode (ACP)',
    bin: 'opencode',
    versionArgs: ['--version'],
    fetchModels: async (resolvedBin, env) =>
      detectAcpModels({
        bin: resolvedBin,
        args: ['acp'],
        env,
        timeoutMs: 15_000,
        defaultModelOption: DEFAULT_MODEL_OPTION,
      }),
    fallbackModels: [DEFAULT_MODEL_OPTION],
    buildArgs: () => ['acp'],
    streamFormat: 'acp-json-rpc',
    resumesSessionViaAcpLoad: true,
    installUrl: 'https://opencode.ai/docs',
    docsUrl: 'https://github.com/sst/opencode',
} satisfies RuntimeAgentDef;
