import { describe, expect, it } from 'vitest';
import { opencodeAcpAgentDef } from '../../src/runtimes/defs/opencode-acp.js';
import { DEFAULT_MODEL_OPTION } from '../../src/runtimes/defs/shared.js';
import type { RuntimeAgentDef } from '../../src/runtimes/types.js';

// Widened so buildArgs can be called with the full contract signature.
const def: RuntimeAgentDef = opencodeAcpAgentDef;

describe('opencode-acp definition', () => {
  it('declares the ACP transport identity', () => {
    expect(opencodeAcpAgentDef.id).toBe('opencode-acp');
    expect(opencodeAcpAgentDef.name).toBe('OpenCode (ACP)');
    expect(opencodeAcpAgentDef.bin).toBe('opencode');
    expect(opencodeAcpAgentDef.versionArgs).toEqual(['--version']);
    expect(opencodeAcpAgentDef.streamFormat).toBe('acp-json-rpc');
  });

  it('spawns the ACP server with no CLI-only flags', () => {
    expect(def.buildArgs('ignored', [], [], {}, {})).toEqual(['acp']);
    expect(def.promptViaStdin).toBeUndefined();
  });

  it('discovers models over the ACP handshake instead of the CLI', () => {
    expect(typeof opencodeAcpAgentDef.fetchModels).toBe('function');
    expect(def.listModels).toBeUndefined();
    expect(opencodeAcpAgentDef.fallbackModels).toEqual([DEFAULT_MODEL_OPTION]);
  });

  it('enables ACP session load for resume', () => {
    expect(opencodeAcpAgentDef.resumesSessionViaAcpLoad).toBe(true);
  });

  it('leaves external MCP injection undefined (ACPs advertises http-only MCP)', () => {
    expect(def.externalMcpInjection).toBeUndefined();
  });
});
