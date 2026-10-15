// Virtual artifact groups ("Collections") for the Design Files panel.
//
// Groups are a presentation-layer container for project artifacts. They live
// in the project's DB metadata (`metadata.artifactGroups`) and never touch
// the filesystem: creating, renaming, or deleting a group leaves every file
// exactly where it is. Entries reference file names exactly as returned by
// GET /api/projects/:id/files (nested paths use "/"); entries whose files no
// longer exist are tolerated on read, and consumers filter them against the
// live file list.
//
// Persistence is a single full-replace document per project (PUT), matching
// the single-writer local UI. Reads are tolerant (malformed stored rows are
// skipped); writes are strict (bad input is rejected as a 400 at the route).
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ProjectArtifactGroup } from '@open-design/contracts';
import { getProject, updateProject } from './db.js';

type SqliteDb = Database.Database;

const MAX_GROUPS = 100;
const MAX_GROUP_NAME_LENGTH = 80;
const MAX_ENTRIES_PER_GROUP = 2000;
const MAX_ID_LENGTH = 128;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEntry(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const segments = raw
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === '..')) return null;
  return segments.join('/');
}

function normalizeEntries(raw: unknown, strict: boolean, groupName: string): string[] {
  if (!Array.isArray(raw)) {
    if (strict) throw new Error(`group "${groupName}" entries must be an array`);
    return [];
  }
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const item of raw) {
    const entry = normalizeEntry(item);
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    entries.push(entry);
  }
  if (strict && entries.length > MAX_ENTRIES_PER_GROUP) {
    throw new Error(`group "${groupName}" exceeds ${MAX_ENTRIES_PER_GROUP} entries`);
  }
  return entries.slice(0, MAX_ENTRIES_PER_GROUP);
}

function normalizeGroup(
  raw: unknown,
  strict: boolean,
  seenIds: Set<string>,
): ProjectArtifactGroup | null {
  if (!isRecord(raw)) {
    if (strict) throw new Error('each group must be an object');
    return null;
  }
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!rawName) {
    if (strict) throw new Error('group name required');
    return null;
  }
  if (strict && rawName.length > MAX_GROUP_NAME_LENGTH) {
    throw new Error(`group name must be at most ${MAX_GROUP_NAME_LENGTH} characters`);
  }
  const name = rawName.slice(0, MAX_GROUP_NAME_LENGTH);
  const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
  let id = rawId.length > 0 && rawId.length <= MAX_ID_LENGTH ? rawId : '';
  if (id.length === 0 || seenIds.has(id)) id = randomUUID();
  seenIds.add(id);
  return { id, name, entries: normalizeEntries(raw.entries, strict, name) };
}

/**
 * Tolerant read of `metadata.artifactGroups`. Never throws: malformed stored
 * rows (hand-edited SQLite, older schema) are skipped so one bad group cannot
 * take down the whole panel.
 */
export function readArtifactGroups(metadata: unknown): ProjectArtifactGroup[] {
  if (!isRecord(metadata)) return [];
  const raw = metadata.artifactGroups;
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const groups: ProjectArtifactGroup[] = [];
  for (const item of raw) {
    const group = normalizeGroup(item, false, seenIds);
    if (group) groups.push(group);
    if (groups.length >= MAX_GROUPS) break;
  }
  return groups;
}

/**
 * Strict normalization for PUT: throws on anything a client should never send
 * (non-array body, missing or oversized names, missing entries array).
 * Malformed entries inside a group are dropped rather than rejected — the
 * referenced file may legitimately have been deleted mid-edit, and the UI
 * filters against the live list anyway.
 */
export function normalizeArtifactGroups(input: unknown): ProjectArtifactGroup[] {
  if (!Array.isArray(input)) throw new Error('groups must be an array');
  if (input.length > MAX_GROUPS) throw new Error(`at most ${MAX_GROUPS} groups`);
  const seenIds = new Set<string>();
  const groups: ProjectArtifactGroup[] = [];
  for (const item of input) {
    const group = normalizeGroup(item, true, seenIds);
    if (group) groups.push(group);
  }
  return groups;
}

/**
 * Merge-save: reads the project row, replaces ONLY `metadata.artifactGroups`,
 * and writes the rest of the metadata back untouched. Returns null when the
 * project does not exist.
 */
export function saveArtifactGroups(
  db: SqliteDb,
  projectId: string,
  groups: ProjectArtifactGroup[],
): ProjectArtifactGroup[] | null {
  const project = getProject(db, projectId);
  if (!project) return null;
  const existing = isRecord(project.metadata) ? project.metadata : {};
  updateProject(db, projectId, { metadata: { ...existing, artifactGroups: groups } });
  return groups;
}
