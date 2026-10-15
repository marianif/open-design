/**
 * Coverage for the virtual artifact groups routes ("Collections"):
 *   GET  /api/projects/:id/artifact-groups
 *   PUT  /api/projects/:id/artifact-groups
 *
 * Groups are metadata-only (`project.metadata.artifactGroups`): these tests
 * pin that the routes never materialize files, that PUT replaces only the
 * groups key (other metadata survives), and that malformed documents are
 * rejected with 400 while harmless junk entries are normalized away.
 */
import type http from 'node:http';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startServer } from '../../src/server.js';

type GroupsPayload = { groups: Array<{ id: string; name: string; entries: string[] }> };
type ApiErrorPayload = { error?: { code?: string } };

describe('artifact groups routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = (await startServer({ port: 0, returnServer: true })) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(() => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function createProject(): Promise<string> {
    const projectId = `proj-groups-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resp = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Groups fixture',
        skillId: null,
        designSystemId: null,
      }),
    });
    expect(resp.status).toBe(200);
    return projectId;
  }

  async function putGroups(projectId: string, groups: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/projects/${projectId}/artifact-groups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups }),
    });
  }

  async function getGroups(projectId: string): Promise<Response> {
    return fetch(`${baseUrl}/api/projects/${projectId}/artifact-groups`);
  }

  it('returns an empty list for a project without groups', async () => {
    const projectId = await createProject();
    const resp = await getGroups(projectId);
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as GroupsPayload;
    expect(body.groups).toEqual([]);
  });

  it('returns 404 for unknown project ids on GET and PUT without creating files', async () => {
    const missingProjectId = `missing-groups-${Date.now()}`;
    const getResp = await getGroups(missingProjectId);
    expect(getResp.status).toBe(404);
    expect(((await getResp.json()) as ApiErrorPayload).error?.code).toBe('PROJECT_NOT_FOUND');

    const putResp = await putGroups(missingProjectId, []);
    expect(putResp.status).toBe(404);
    expect(((await putResp.json()) as ApiErrorPayload).error?.code).toBe('PROJECT_NOT_FOUND');

    const dataDir = process.env.OD_DATA_DIR;
    if (!dataDir) throw new Error('OD_DATA_DIR is required for daemon route tests');
    await expect(stat(path.join(dataDir, 'projects', missingProjectId))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('round-trips groups and preserves other metadata keys', async () => {
    const projectId = await createProject();

    // Seed an unrelated metadata key through the generic patch route so the
    // merge-save behavior has something to preserve.
    const patchResp = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { kind: 'web' } }),
    });
    expect(patchResp.status).toBe(200);

    const putResp = await putGroups(projectId, [
      { id: 'g-landing', name: 'Landing', entries: ['trackly-landing.html', 'trackly-v2.html'] },
      { name: 'Blog', entries: [] },
    ]);
    expect(putResp.status).toBe(200);
    const saved = (await putResp.json()) as GroupsPayload;
    expect(saved.groups).toHaveLength(2);
    expect(saved.groups[0]).toEqual({
      id: 'g-landing',
      name: 'Landing',
      entries: ['trackly-landing.html', 'trackly-v2.html'],
    });
    expect(saved.groups[1]!.name).toBe('Blog');
    expect(saved.groups[1]!.id).toBeTruthy();
    expect(saved.groups[1]!.entries).toEqual([]);

    const getResp = await getGroups(projectId);
    expect(getResp.status).toBe(200);
    expect(await getResp.json()).toEqual({ groups: saved.groups });

    const detail = (await (await fetch(`${baseUrl}/api/projects/${projectId}`)).json()) as {
      project: { metadata?: Record<string, unknown> };
    };
    expect(detail.project.metadata?.kind).toBe('web');
    expect(Array.isArray(detail.project.metadata?.artifactGroups)).toBe(true);
  });

  it('normalizes entries and regenerates duplicate or missing ids', async () => {
    const projectId = await createProject();
    const putResp = await putGroups(projectId, [
      {
        id: 'dup',
        name: '  First  ',
        entries: ['a.html', './a.html', 'a.html', 'dir//b.html', '../escape.html', 42],
      },
      { id: 'dup', name: 'Second', entries: [] },
    ]);
    expect(putResp.status).toBe(200);
    const saved = (await putResp.json()) as GroupsPayload;
    expect(saved.groups[0]!.name).toBe('First');
    // Duplicate and dot-prefixed entries collapse; traversal entries and
    // non-strings are dropped.
    expect(saved.groups[0]!.entries).toEqual(['a.html', 'dir/b.html']);
    expect(saved.groups[1]!.id).not.toBe('dup');
  });

  it('replaces the full document on PUT', async () => {
    const projectId = await createProject();
    const first = await putGroups(projectId, [
      { id: 'a', name: 'A', entries: [] },
      { id: 'b', name: 'B', entries: [] },
    ]);
    expect(first.status).toBe(200);

    const second = await putGroups(projectId, [{ id: 'b', name: 'B2', entries: [] }]);
    expect(second.status).toBe(200);

    const body = (await (await getGroups(projectId)).json()) as GroupsPayload;
    expect(body.groups.map((group) => group.id)).toEqual(['b']);
    expect(body.groups[0]!.name).toBe('B2');
  });

  it('rejects malformed documents with 400', async () => {
    const projectId = await createProject();
    const malformed: unknown[] = [
      'nope',
      42,
      {},
      [null],
      [{ id: 'x', name: '' }],
      [{ id: 'x', name: 'ok', entries: 'nope' }],
    ];
    for (const groups of malformed) {
      const resp = await putGroups(projectId, groups);
      expect(resp.status).toBe(400);
      expect(((await resp.json()) as ApiErrorPayload).error?.code).toBe('BAD_REQUEST');
    }

    // Nothing was persisted by any of the rejected writes.
    const body = (await (await getGroups(projectId)).json()) as GroupsPayload;
    expect(body.groups).toEqual([]);
  });
});
