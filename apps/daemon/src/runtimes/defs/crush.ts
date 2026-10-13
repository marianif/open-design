import { DEFAULT_MODEL_OPTION } from './shared.js';
import type { RuntimeAgentDef } from '../types.js';

// Crush — Charm's terminal-first coding agent, and the living continuation of
// the archived opencode-ai/opencode (the original Go OpenCode).
// Repo:    https://github.com/charmbracelet/crush
// Install: brew install charmbracelet/tap/crush (or npm/apt/yum/nix — see repo)
//
// Headless mode: `crush run [prompt...]` executes one non-interactive turn and
// prints the assistant reply as plain text on stdout, exiting on Crush's
// terminal RunComplete event. The composed prompt is delivered over stdin —
// Crush's MaybePrependStdin joins piped stdin onto any argv prompt, so an
// empty argv plus piped stdin carries the full OD prompt without argv length
// limits, mirroring the OpenCode / Copilot transport. `-q` hides the spinner.
//
// Permissions: `crush run` enters Crush's non-interactive mode, whose app
// layer calls `Permissions.AutoApproveSession` for the run — tool approvals
// cannot hang a daemon spawn that has no TTY. The `--yolo` flag shown in
// Crush docs is a root-TUI flag: crush v0.98.1 rejects `crush --yolo run`
// (and `crush run --yolo`) as an unknown flag, so this adapter deliberately
// passes no permission-bypass flag.
//
// Sessions: Crush persists its own sessions (`crush session list --json`),
// but `crush run` does not print the minted session id on stdout and the
// daemon has no capture hook for plain streams, so this def declares no
// resume transport — follow-up turns rely on the daemon-side transcript
// injection shared by deepseek / aider / atomcode.
//
// Models: `crush models` prints Charm's full Catwalk catalog (~1,700 ids
// across configured and unconfigured providers) — far too broad for the
// picker. Like DeepSeek, this def ships a small curated fallback set matched
// against Catwalk and accepts any other id via `-m provider/model` through
// the custom-model input.
//
// Authentication is CLI-owned: Crush stores provider credentials under
// ~/.config/crush, and users configure one by running `crush` (or by setting
// the provider's environment variable). Without one, `crush run` fails fast
// with "No providers configured - please run 'crush' to set up a provider
// interactively." The daemon never injects credentials, and no `authProbe`
// is declared.
//
// External MCP servers are not forwarded (`externalMcpInjection` stays
// undefined): Crush reads MCP config from its own crushrc / crush.json, so
// standing integrations belong there (see `od mcp install crush`).
export const crushAgentDef = {
    id: 'crush',
    name: 'Crush',
    bin: 'crush',
    versionArgs: ['--version'],
    fallbackModels: [
        DEFAULT_MODEL_OPTION,
        {
            id: 'anthropic/claude-sonnet-4-5-20250929',
            label: 'anthropic/claude-sonnet-4-5-20250929',
        },
        { id: 'openai/gpt-5.2', label: 'openai/gpt-5.2' },
        { id: 'openai/gpt-5.2-codex', label: 'openai/gpt-5.2-codex' },
        { id: 'zhipu/glm-5.3', label: 'zhipu/glm-5.3' },
    ],
    // Prompt via stdin (`promptViaStdin: true`) — never embedded in argv.
    // `-m <id>` is appended for a concrete model; `default` keeps Crush's
    // own configured model (the picker's "Default (CLI config)").
    buildArgs: (_prompt, _imagePaths, _extraAllowedDirs, options = {}, _runtimeContext = {}) => {
      const args = ['run', '-q'];
      if (options.model && options.model !== DEFAULT_MODEL_OPTION.id) {
        args.push('-m', options.model);
      }
      return args;
    },
    promptViaStdin: true,
    streamFormat: 'plain',
    installUrl: 'https://github.com/charmbracelet/crush#installation',
    docsUrl: 'https://github.com/charmbracelet/crush',
} satisfies RuntimeAgentDef;
