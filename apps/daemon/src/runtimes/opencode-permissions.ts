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
 * v2 removed `--dir` (and the git-root walk): the process cwd IS the
 * project, and the daemon already spawns in the project cwd, so v2 builds
 * must not receive the flag — they reject it as an unknown option and the
 * run fails at spawn. v1 builds keep the unconditional append for the
 * silent-data-loss reason above: a v1 build without `--dir` should fail
 * loudly at spawn rather than degrade to the wrong worktree.
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
