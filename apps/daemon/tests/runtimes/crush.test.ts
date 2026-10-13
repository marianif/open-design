import { describe, expect, it } from 'vitest';
import { crushAgentDef } from '../../src/runtimes/defs/crush.js';
import { DEFAULT_MODEL_OPTION } from '../../src/runtimes/defs/shared.js';
import type { RuntimeAgentDef } from '../../src/runtimes/types.js';

// Widen to the declared contract so the absence assertions below can address
// optional fields that `satisfies` intentionally keeps out of the literal type.
const def: RuntimeAgentDef = crushAgentDef;

describe('crush buildArgs', () => {
  it('emits the exact base argv without embedding the prompt', () => {
    const prompt = 'do not put this prompt in argv';
    const args = crushAgentDef.buildArgs(prompt, [], [], {});

    expect(args).toEqual(['run', '-q']);
    expect(args).not.toContain(prompt);
  });

  it('appends -m for a non-default model', () => {
    const args = crushAgentDef.buildArgs('prompt', [], [], {
      model: 'anthropic/claude-sonnet-4-5-20250929',
    });

    expect(args).toEqual([
      'run',
      '-q',
      '-m',
      'anthropic/claude-sonnet-4-5-20250929',
    ]);
  });

  it('omits -m for the default sentinel', () => {
    const args = crushAgentDef.buildArgs('prompt', [], [], {
      model: DEFAULT_MODEL_OPTION.id,
    });

    expect(args).toEqual(['run', '-q']);
  });

  it('never emits session resume flags or the prompt in argv', () => {
    const prompt = 'multi-turn follow up';
    const args = crushAgentDef.buildArgs(prompt, [], [], {}, {
      cwd: '/tmp/project',
      resumeSessionId: 'do-not-forward-this',
    });

    expect(args).not.toContain('-s');
    expect(args).not.toContain('--session');
    expect(args).not.toContain('-C');
    expect(args).not.toContain('--continue');
    expect(args).not.toContain('do-not-forward-this');
    expect(args).not.toContain(prompt);
  });
});

describe('crush definition metadata', () => {
  it('declares the runtime identity', () => {
    expect(crushAgentDef.id).toBe('crush');
    expect(crushAgentDef.name).toBe('Crush');
    expect(crushAgentDef.bin).toBe('crush');
    expect(crushAgentDef.versionArgs).toEqual(['--version']);
  });

  it('delivers the prompt over stdin with plain output', () => {
    expect(crushAgentDef.promptViaStdin).toBe(true);
    expect(crushAgentDef.streamFormat).toBe('plain');
  });

  it('declares no resume transport or MCP injection', () => {
    expect(def.resumesSessionViaCli).toBeUndefined();
    expect(def.capturesSessionIdFromStream).toBeUndefined();
    expect(def.externalMcpInjection).toBeUndefined();
  });
});
