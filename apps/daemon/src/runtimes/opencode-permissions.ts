import path from 'node:path';

import { agentCapabilities } from './capabilities.js';
import type { RuntimeAgentDef } from './types.js';

export const OPENCODE_SKIP_PERMISSIONS_FLAG = '--dangerously-skip-permissions';
export const OPENCODE_AUTO_APPROVE_FLAG = '--auto';
export const OPENCODE_WORKSPACE_DIR_FLAG = '--dir';

export const OPENCODE_PERMISSION_CAPABILITY = {
  helpArgs: ['run', '--help'],
  capabilityFlags: {
    // OpenCode v2 renamed the non-interactive approval flag to `--auto`
    // ("Auto-approve permissions that are not explicitly denied"); v1
    // builds only advertise `--dangerously-skip-permissions`. Both are
    // probed from `run --help`, and `--auto` doubles as the v2 signature
    // for the other v1→v2 surface changes: `--variant` and `--dir` were
    // removed (the variant rides inside `-m provider/model#variant`, and
    // the process cwd is the project).
    [OPENCODE_AUTO_APPROVE_FLAG]: 'autoApprovePermissions',
    [OPENCODE_SKIP_PERMISSIONS_FLAG]: 'skipPermissions',
  },
} satisfies Pick<RuntimeAgentDef, 'helpArgs' | 'capabilityFlags'>;

/** True when the installed OpenCode advertises the v2-era `--auto` flag. */
export function isOpenCodeV2(agentId: string): boolean {
  return agentCapabilities.get(agentId)?.autoApprovePermissions === true;
}

export function appendOpenCodePermissionBypass(args: string[], agentId: string): void {
  const caps = agentCapabilities.get(agentId);
  if (caps?.autoApprovePermissions) {
    args.push(OPENCODE_AUTO_APPROVE_FLAG);
    return;
  }
  if (caps?.skipPermissions) {
    args.push(OPENCODE_SKIP_PERMISSIONS_FLAG);
  }
}

/**
 * Pin OpenCode's workspace to the resolved project directory (v1 builds).
 *
 * v1 does not treat its process cwd as the project: it walks up to the
 * nearest enclosing git root and adopts THAT as the worktree (verified with
 * `opencode debug scrap`, whose every registered project is a git root). A
 * managed project directory is not a git repository, and a development
 * install keeps the daemon data directory under the repository root — so
 * v1 walks past the project and adopts the whole Open Design checkout.
 *
 * The consequences were all silent: the agent named the repository root as
 * its workspace and wrote the deliverable there, the project directory
 * stayed empty, `snapshotProjectArtifactsAsync(cwd)` saw nothing, and the
 * Run reported `no_artifact`. `permission.external_directory` could not
 * catch it either — once the repository was the worktree, writing inside
 * it was an in-project write.
 *
 * v2 removed `--dir` (and the git-root walk): a run resolves its workspace
 * as `options.root ?? process.env.PWD ?? process.cwd()` and `chdir`s there
 * before any model call, and Node's `spawn({ cwd })` never updates `PWD`.
 * v2 builds therefore must not receive the flag AND their environment must
 * be pinned instead — see `pinOpenCodeWorkspaceEnv`, called by every
 * OpenCode launch site (chat spawn, connection test, memory extractor).
 * v1 builds keep the unconditional append for the silent-data-loss reason
 * above: a v1 build without `--dir` should fail loudly at spawn rather than
 * degrade to the wrong worktree.
 */
export function appendOpenCodeWorkspaceDir(
  args: string[],
  cwd: string | null | undefined,
  agentId: string,
): void {
  if (typeof cwd !== 'string' || cwd.length === 0) return;
  if (isOpenCodeV2(agentId)) return;
  args.push(OPENCODE_WORKSPACE_DIR_FLAG, cwd);
}

/**
 * Pin OpenCode v2's workspace through the environment.
 *
 * A non-interactive v2 run resolves `options.root ?? process.env.PWD ??
 * process.cwd()` and `chdir`s to it before any model call (verified on
 * v2.0.18 and v2.0.26: an inherited `PWD` pointing at a missing directory
 * exits with `Failed to change directory to <path>` before the model call).
 * Node's `spawn({ cwd })` never updates `PWD`, and the daemon inherits its
 * own launch directory, so without this a v2 run spawned in a managed
 * project directory would adopt the daemon's directory — the same silent
 * wrong-worktree bug `--dir` prevents on v1.
 *
 * Only v2 builds are pinned; v1 keeps `--dir` (see above). An unwarmed
 * capability map leaves `PWD` alone too, so the v1 fallback keeps appending
 * the flag. Call this with the exact env object handed to the spawn.
 */
export function pinOpenCodeWorkspaceEnv(
  env: NodeJS.ProcessEnv,
  cwd: string | null | undefined,
  agentId: string,
): void {
  if (!isOpenCodeV2(agentId)) return;
  if (typeof cwd !== 'string' || cwd.length === 0) return;
  env.PWD = path.resolve(cwd);
}
