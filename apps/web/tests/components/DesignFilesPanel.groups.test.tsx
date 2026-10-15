// @vitest-environment jsdom
//
// Coverage for the virtual artifact groups ("Collections") UI: the chip-bar
// mode switch, membership filtering, inline create/rename, and the batch
// "Add to group" action. The panel is the single writer of the group document;
// every mutation goes out through `onSaveGroups` as one full-replace payload.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import { DesignFilesPanel } from "../../src/components/DesignFilesPanel";
import type { ProjectArtifactGroup, ProjectFile } from "../../src/types";

// Stub localStorage so the panel's view-state persistence writes to an
// in-memory store instead of bleeding across tests.
const lsStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => lsStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    lsStore.set(key, value);
  },
  removeItem: (key: string) => {
    lsStore.delete(key);
  },
  clear: () => {
    lsStore.clear();
  },
});

beforeEach(() => {
  lsStore.clear();
});

function file(
  overrides: Partial<ProjectFile> & Pick<ProjectFile, "name">,
): ProjectFile {
  return {
    path: overrides.name,
    type: "file",
    size: 1024,
    mtime: Date.now(),
    kind: "html",
    mime: "text/html",
    ...overrides,
  };
}

const FILES: ProjectFile[] = [
  file({ name: "landing.html" }),
  file({ name: "blog.html" }),
  file({ name: "app.png", kind: "image", mime: "image/png" }),
];

const GROUPS: ProjectArtifactGroup[] = [
  { id: "g1", name: "Landing", entries: ["landing.html"] },
  { id: "g2", name: "Blog", entries: [] },
];

function renderPanel(
  overrides: Partial<ComponentProps<typeof DesignFilesPanel>> = {},
) {
  return render(
    <DesignFilesPanel
      projectId="test-project"
      projectKind="prototype"
      files={FILES}
      liveArtifacts={[]}
      onRefreshFiles={vi.fn()}
      onOpenFile={vi.fn()}
      onOpenLiveArtifact={vi.fn()}
      onRenameFile={vi.fn()}
      onDeleteFile={vi.fn()}
      onDeleteFiles={vi.fn()}
      onUpload={vi.fn()}
      onUploadFiles={vi.fn()}
      onPaste={vi.fn()}
      onNewSketch={vi.fn()}
      {...overrides}
    />,
  );
}

// Rows carry `.df-row-check`, cards `.df-card-check` — select either.
function selectionToggle(container: HTMLElement, name: string): HTMLElement {
  const row = container.querySelector(`[data-testid="design-file-row-${name}"]`);
  if (!row) throw new Error(`row not found: ${name}`);
  const toggle = row.querySelector(".df-row-check, .df-card-check");
  if (!(toggle instanceof HTMLElement)) throw new Error(`selection toggle not found: ${name}`);
  return toggle;
}

describe("DesignFilesPanel groups (Collections)", () => {
  afterEach(() => {
    cleanup();
  });

  it("hides the mode switch on read-only mounts", () => {
    renderPanel({ viewerOnly: true, groups: GROUPS, onSaveGroups: vi.fn() });
    expect(screen.queryByTestId("design-files-mode-group")).toBeNull();
    expect(screen.queryByTestId("design-files-mode-type")).toBeNull();
  });

  it("switches chip modes and filters the grid by group membership", () => {
    renderPanel({ groups: GROUPS, onSaveGroups: vi.fn(async (_next: ProjectArtifactGroup[]) => true) });

    fireEvent.click(screen.getByTestId("design-files-mode-group"));

    // Group chips: All, the two groups, Ungrouped, and the creator.
    expect(screen.getByTestId("design-files-tab-all")).toBeTruthy();
    expect(screen.getByTestId("design-files-tab-group-g1")).toBeTruthy();
    expect(screen.getByTestId("design-files-tab-group-g2")).toBeTruthy();
    expect(screen.getByTestId("design-files-tab-ungrouped")).toBeTruthy();
    expect(screen.getByTestId("design-files-new-group")).toBeTruthy();

    // All shows every file.
    expect(screen.getByTestId("design-file-row-landing.html")).toBeTruthy();
    expect(screen.getByTestId("design-file-row-blog.html")).toBeTruthy();

    // Selecting a group narrows the grid to its members.
    fireEvent.click(screen.getByTestId("design-files-tab-group-g1"));
    expect(screen.getByTestId("design-file-row-landing.html")).toBeTruthy();
    expect(screen.queryByTestId("design-file-row-blog.html")).toBeNull();

    // Ungrouped shows everything no group claims.
    fireEvent.click(screen.getByTestId("design-files-tab-ungrouped"));
    expect(screen.queryByTestId("design-file-row-landing.html")).toBeNull();
    expect(screen.getByTestId("design-file-row-blog.html")).toBeTruthy();
    expect(screen.getByTestId("design-file-row-app.png")).toBeTruthy();
  });

  it("creates a group from the chip bar and saves the document", async () => {
    const onSaveGroups = vi.fn(async (_next: ProjectArtifactGroup[]) => true);
    renderPanel({ groups: [], onSaveGroups });

    fireEvent.click(screen.getByTestId("design-files-mode-group"));
    fireEvent.click(screen.getByTestId("design-files-new-group"));

    const input = screen.getByTestId("design-files-group-create-input");
    fireEvent.change(input, { target: { value: "Paywalls" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onSaveGroups).toHaveBeenCalledTimes(1));
    const saved = onSaveGroups.mock.calls[0]![0] as ProjectArtifactGroup[];
    expect(saved).toHaveLength(1);
    expect(saved[0]!.name).toBe("Paywalls");
    expect(saved[0]!.entries).toEqual([]);
    expect(saved[0]!.id).toBeTruthy();
  });

  it("adds the current selection to an existing group from the batch bar", async () => {
    const onSaveGroups = vi.fn(async (_next: ProjectArtifactGroup[]) => true);
    const { container } = renderPanel({ groups: GROUPS, onSaveGroups });

    fireEvent.click(selectionToggle(container, "landing.html"));
    fireEvent.click(selectionToggle(container, "blog.html"));

    fireEvent.click(screen.getByTestId("design-files-batch-add-to-group"));
    fireEvent.click(await screen.findByTestId("design-files-add-to-group-g2"));

    await waitFor(() => expect(onSaveGroups).toHaveBeenCalledTimes(1));
    const saved = onSaveGroups.mock.calls[0]![0] as ProjectArtifactGroup[];
    const blog = saved.find((group) => group.id === "g2")!;
    expect(blog.entries).toEqual(["landing.html", "blog.html"]);
    // The other group is carried through untouched.
    expect(saved.find((group) => group.id === "g1")).toEqual(GROUPS[0]);
  });

  it("surfaces a retry notice when the group save is rejected", async () => {
    const onSaveGroups = vi.fn(async (_next: ProjectArtifactGroup[]) => false);
    renderPanel({ groups: [], onSaveGroups });

    fireEvent.click(screen.getByTestId("design-files-mode-group"));
    fireEvent.click(screen.getByTestId("design-files-new-group"));
    const input = screen.getByTestId("design-files-group-create-input");
    fireEvent.change(input, { target: { value: "Broken" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByText(/Couldn’t save groups/)).toBeTruthy();
  });
});
