import path from 'node:path';
import { test } from 'vitest';

import { assert } from './helpers/test-helpers.js';
import { agentCapabilities } from '../../src/runtimes/capabilities.js';
import {
  appendOpenCodeWorkspaceDir,
  pinOpenCodeWorkspaceEnv,
} from '../../src/runtimes/opencode-permissions.js';

// ---- OpenCode v2 workspace pinning -----------------------------------------
//
// OpenCode v2 resolves its workspace as `root ?? process.env.PWD ?? cwd` and
// Node's spawn({ cwd }) never updates `PWD`. The daemon inherits its own
// launch directory, so every v2 spawn site must pin `PWD` to the project
// directory explicitly — otherwise the run silently adopts the daemon's
// directory and the project stays empty (the bug `--dir` prevents on v1).

test('pinOpenCodeWorkspaceEnv pins the project dir over an inherited daemon PWD on v2', () => {
  agentCapabilities.set('opencode', { autoApprovePermissions: true });
  try {
    const env: NodeJS.ProcessEnv = { PWD: '/daemon/checkout' };
    pinOpenCodeWorkspaceEnv(env, '/projects/p1', 'opencode');
    assert.equal(env.PWD, path.resolve('/projects/p1'));
  } finally {
    agentCapabilities.delete('opencode');
  }
});

test('pinOpenCodeWorkspaceEnv resolves a relative project dir to an absolute PWD', () => {
  agentCapabilities.set('opencode', { autoApprovePermissions: true });
  try {
    const env: NodeJS.ProcessEnv = {};
    pinOpenCodeWorkspaceEnv(env, 'relative/project', 'opencode');
    assert.equal(env.PWD, path.resolve('relative/project'));
  } finally {
    agentCapabilities.delete('opencode');
  }
});

test('pinOpenCodeWorkspaceEnv leaves PWD alone for v1 and unwarmed capabilities', () => {
  for (const caps of [{ skipPermissions: true }, undefined]) {
    if (caps) agentCapabilities.set('opencode', caps);
    else agentCapabilities.delete('opencode');
    try {
      const env: NodeJS.ProcessEnv = { PWD: '/daemon/checkout' };
      pinOpenCodeWorkspaceEnv(env, '/projects/p1', 'opencode');
      assert.equal(env.PWD, '/daemon/checkout');
    } finally {
      agentCapabilities.delete('opencode');
    }
  }
});

test('pinOpenCodeWorkspaceEnv ignores missing or empty cwd values', () => {
  agentCapabilities.set('opencode', { autoApprovePermissions: true });
  try {
    const env: NodeJS.ProcessEnv = { PWD: '/daemon/checkout' };
    pinOpenCodeWorkspaceEnv(env, undefined, 'opencode');
    pinOpenCodeWorkspaceEnv(env, null, 'opencode');
    pinOpenCodeWorkspaceEnv(env, '', 'opencode');
    assert.equal(env.PWD, '/daemon/checkout');
  } finally {
    agentCapabilities.delete('opencode');
  }
});

test('appendOpenCodeWorkspaceDir keeps --dir on v1 and adds nothing on v2', () => {
  agentCapabilities.delete('opencode');
  const v1Args: string[] = [];
  appendOpenCodeWorkspaceDir(v1Args, '/projects/p1', 'opencode');
  assert.deepEqual(v1Args, ['--dir', '/projects/p1']);

  agentCapabilities.set('opencode', { autoApprovePermissions: true });
  try {
    const v2Args: string[] = [];
    appendOpenCodeWorkspaceDir(v2Args, '/projects/p1', 'opencode');
    assert.deepEqual(v2Args, []);
  } finally {
    agentCapabilities.delete('opencode');
  }
});
