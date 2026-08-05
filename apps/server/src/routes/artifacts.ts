import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
import { SqliteStorage } from '@ai-game-arena/storage';
import { existsSync, mkdirSync } from 'fs';
import { rm, readdir, writeFile, readFile, cp } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { $ } from 'bun';

export type ArtifactType = 'plugin' | 'game' | 'arena';
export type ArtifactStatus = 'uploaded' | 'installed' | 'enabled' | 'disabled';

interface ArtifactRow {
  id: string;
  type: string;
  slug: string;
  name: string;
  version: string;
  manifest: string;
  status: string;
  path: string;
  description: string | null;
  published_at: number | null;
  published_by: string | null;
  created_at: number;
  updated_at: number;
}

interface ParsedManifest {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  category?: string;
  author?: string;
  contributions?: Record<string, unknown>;
  entry?: string;
  activation?: Record<string, unknown>;
}

const VALID_TYPES = new Set<ArtifactType>(['plugin', 'game', 'arena']);

function targetDir(type: ArtifactType, projectRoot: string): string {
  // arenas are contributed by plugins (per docs) — staged under plugins/.
  return type === 'arena' ? join(projectRoot, 'plugins') : join(projectRoot, `${type}s`);
}

function parseManifestFromBuffer(buf: Buffer): ParsedManifest | null {
  try {
    return JSON.parse(buf.toString('utf-8')) as ParsedManifest;
  } catch {
    return null;
  }
}

/**
 * Extracts a zip and reads the manifest (`plugin.json` for plugins,
 * `game.json` for games, `arena.json` for arenas, or `manifest.json` as fallback).
 * Returns parsed manifest + on-disk slug resolved from directory structure inside the zip
 * (top-level folder name, or manifest.id if single-file).
 */

export function createArtifactRoutes(container: Container, projectRoot: string) {
  const app = new Hono();
  const storage = container.resolve<SqliteStorage>('storage');
  const stagingRoot = join(projectRoot, '.staging', 'artifacts');
  mkdirSync(stagingRoot, { recursive: true });

  // ---- List all artifacts of a given type (optionally include published) ----
  app.get('/', async (c) => {
    const type = (c.req.query('type') ?? '') as ArtifactType;
    const includePublished = c.req.query('published') === '1';
    let rows: ArtifactRow[];
    if (type && VALID_TYPES.has(type)) {
      rows = await storage.all<ArtifactRow>(
        'SELECT * FROM artifacts WHERE type = ? ORDER BY created_at DESC',
        [type],
      );
    } else {
      rows = await storage.all<ArtifactRow>('SELECT * FROM artifacts ORDER BY created_at DESC');
    }
    const items = rows
      .filter((r) => includePublished || r.published_at === null || r.type === (type || r.type))
      .map((r) => rowToArtifact(r));
    return c.json(items);
  });

  // ---- Marketplace listing: published artifacts only ----
  app.get('/marketplace', async (c) => {
    const rows = await storage.all<ArtifactRow>(
      'SELECT * FROM artifacts WHERE published_at IS NOT NULL ORDER BY published_at DESC',
    );
    return c.json(rows.map(rowToArtifact));
  });

  // ---- Upload a zip ----
  app.post('/upload', async (c) => {
    const type = (c.req.query('type') ?? '') as ArtifactType;
    if (!VALID_TYPES.has(type)) return c.json({ error: 'Invalid type (plugin|game|arena)' }, 400);

    const body = await c.req.parseBody();
    const file = body['file'];
    if (!(file instanceof File)) return c.json({ error: 'No `file` field in form upload' }, 400);

    const buf = Buffer.from(await file.arrayBuffer());

    const id = randomUUID();
    const stageDir = join(stagingRoot, id);
    mkdirSync(stageDir, { recursive: true });
    const zipPath = join(stageDir, 'upload.zip');
    await writeFile(zipPath, buf);

    const extractDir = join(stageDir, 'extracted');
    mkdirSync(extractDir, { recursive: true });
    try {
      // Shell out to `unzip` (present on macOS/Linux). -o overwrite, -q quiet.
      await $`unzip -o -q ${zipPath} -d ${extractDir}`.quiet();
    } catch (err) {
      return c.json({ error: `Failed to unzip: ${(err as Error).message}` }, 400);
    }

    // Locate manifest inside extracted dir.
    const manifestInfo = await findManifest(extractDir);
    if (!manifestInfo) {
      await rm(stageDir, { recursive: true, force: true });
      return c.json(
        {
          error:
            'No plugin.json / game.json / arena.json / manifest.json found in zip root or single subdir',
        },
        400,
      );
    }
    const { manifest, basePath } = manifestInfo;
    const slug =
      (manifest.id as string | undefined) ??
      sanitizeSlug(basePath.split('/').pop() ?? `artifact-${id}`)!;

    // Detect duplicate slug
    const dup = await storage.getOne<{ id: string }>(
      'SELECT id FROM artifacts WHERE type = ? AND slug = ?',
      [type, slug],
    );
    if (dup) {
      await rm(stageDir, { recursive: true, force: true });
      return c.json({ error: `Artifact with slug '${slug}' (${type}) already exists` }, 409);
    }

    const now = Date.now();
    const persistDir = join(targetDir(type, projectRoot), slug);
    // Move extracted basePath into the runtime discovery dir
    if (existsSync(persistDir)) await rm(persistDir, { recursive: true, force: true });
    mkdirSync(targetDir(type, projectRoot), { recursive: true });

    // Copy basePath -> persistDir via Bun.mkdir + recursive copy
    await copyTree(basePath, persistDir);
    await rm(stageDir, { recursive: true, force: true });

    await storage.run(
      `INSERT INTO artifacts (id, type, slug, name, version, manifest, status, path, description, published_at, published_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        id,
        type,
        slug,
        manifest.name ?? slug,
        manifest.version ?? '1.0.0',
        JSON.stringify(manifest),
        'uploaded',
        persistDir,
        manifest.description ?? null,
        now,
        now,
      ],
    );

    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    return c.json(rowToArtifact(row!), 201);
  });

  // ---- Lifecycle: install / uninstall / enable / disable / remove ----
  app.post('/:id/install', async (c) => {
    const id = c.req.param('id');
    const updated = await setStatus(id, 'installed');
    return updated ? c.json(updated) : c.json({ error: 'Not found' }, 404);
  });

  app.post('/:id/uninstall', async (c) => {
    const id = c.req.param('id');
    const updated = await setStatus(id, 'uploaded');
    return updated ? c.json(updated) : c.json({ error: 'Not found' }, 404);
  });

  app.post('/:id/enable', async (c) => {
    const id = c.req.param('id');
    const updated = await setStatus(id, 'enabled');
    return updated ? c.json(updated) : c.json({ error: 'Not found' }, 404);
  });

  app.post('/:id/disable', async (c) => {
    const id = c.req.param('id');
    const updated = await setStatus(id, 'disabled');
    return updated ? c.json(updated) : c.json({ error: 'Not found' }, 404);
  });

  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (existsSync(row.path)) await rm(row.path, { recursive: true, force: true });
    await storage.run('DELETE FROM artifacts WHERE id = ?', [id]);
    return c.json({ status: 'removed', id });
  });

  // ---- Marketplace publish / unpublish ----
  app.post('/:id/publish', async (c) => {
    const id = c.req.param('id');
    const by = c.req.header('x-user') ?? 'admin';
    const now = Date.now();
    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (row.status !== 'enabled' && row.status !== 'installed') {
      return c.json({ error: 'Artifact must be installed/enabled before publishing' }, 400);
    }
    await storage.run(
      'UPDATE artifacts SET published_at = ?, published_by = ?, updated_at = ? WHERE id = ?',
      [now, by, now, id],
    );
    const updated = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    return c.json(rowToArtifact(updated!));
  });

  app.post('/:id/unpublish', async (c) => {
    const id = c.req.param('id');
    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!row) return c.json({ error: 'Not found' }, 404);
    await storage.run(
      'UPDATE artifacts SET published_at = NULL, published_by = NULL, updated_at = ? WHERE id = ?',
      [Date.now(), id],
    );
    const updated = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    return c.json(rowToArtifact(updated!));
  });

  async function setStatus(id: string, status: ArtifactStatus) {
    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    if (!row) return null;
    await storage.run('UPDATE artifacts SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      Date.now(),
      id,
    ]);
    const updated = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    return updated ? rowToArtifact(updated) : null;
  }

  function rowToArtifact(r: ArtifactRow) {
    return {
      id: r.id,
      type: r.type,
      slug: r.slug,
      name: r.name,
      version: r.version,
      description: r.description,
      manifest: JSON.parse(r.manifest) as ParsedManifest,
      status: r.status as ArtifactStatus,
      path: r.path,
      published: r.published_at !== null,
      published_at: r.published_at,
      published_by: r.published_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }
  // ---- Convert a game artifact ----
  app.post('/convert', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    const targetFormat = (body['format'] ?? 'html') as string;

    if (!(file instanceof File)) {
      return c.json({ error: 'No `file` field in form upload' }, 400);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const idempotencyKey = randomUUID();
    const stageDir = join(stagingRoot, `convert-${idempotencyKey}`);
    mkdirSync(stageDir, { recursive: true });
    const zipPath = join(stageDir, 'upload.zip');
    await writeFile(zipPath, buf);

    const extractDir = join(stageDir, 'extracted');
    mkdirSync(extractDir, { recursive: true });
    try {
      await $`unzip -o -q ${zipPath} -d ${extractDir}`.quiet();
      // Strip macOS resource-fork junk so it never leaks into games/
      const macJunk = join(extractDir, '__MACOSX');
      if (existsSync(macJunk)) await rm(macJunk, { recursive: true, force: true });
    } catch (err) {
      await rm(stageDir, { recursive: true, force: true });
      return c.json({ error: `Failed to unzip: ${(err as Error).message}` }, 400);
    }

    // Find the HTML entry point; prefer an index.html at the shallowest depth.
    const htmlFiles = await findHtmlFiles(extractDir);
    if (htmlFiles.length === 0) {
      await rm(stageDir, { recursive: true, force: true });
      return c.json({ error: 'No HTML file found in zip' }, 400);
    }
    const htmlEntry = htmlFiles
      .slice()
      .sort((a, b) => a.split('/').length - b.split('/').length)
      .find((f) => /(^|\/)index\.html?$/.test(f)) ?? htmlFiles[0]!;

    // Create game.json manifest for the converted game
    const gameId = `converted-${idempotencyKey.slice(0, 8)}`;
    const gameName = `Converted Game (${targetFormat})`;
    const adapterType =
      targetFormat === 'canvas' ? 'canvas' :
      targetFormat === 'dom' ? 'dom' :
      'web';
    const gameManifest = {
      id: gameId,
      name: gameName,
      description: `Converted from ${targetFormat} format`,
      version: '1.0.0',
      category: 'game',
      format: targetFormat,
      adapterType,
      min_players: 1,
      max_players: 4,
      entry: htmlEntry.replace(extractDir + '/', ''),
    };

    // Write game.json
    await writeFile(join(extractDir, 'game.json'), JSON.stringify(gameManifest, null, 2));

    // Copy to the games directory
    const persistDir = join(targetDir('game', projectRoot), gameId);
    if (existsSync(persistDir)) await rm(persistDir, { recursive: true, force: true });
    mkdirSync(targetDir('game', projectRoot), { recursive: true });
    await copyTree(extractDir, persistDir);
    await rm(stageDir, { recursive: true, force: true });

    // Store artifact record
    const now = Date.now();
    await storage.run(
      `INSERT INTO artifacts (id, type, slug, name, version, manifest, status, path, description, published_at, published_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        idempotencyKey,
        'game',
        gameId,
        gameName,
        '1.0.0',
        JSON.stringify(gameManifest),
        'uploaded',
        persistDir,
        `Converted from ${targetFormat} format`,
        now,
        now,
      ],
    );

    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [idempotencyKey]);
    return c.json(rowToArtifact(row!), 201);
  });

  return app;
}

// ---- helpers ----

function sanitizeSlug(s: string): string | null {
  const m = s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .match(/^[a-z0-9-]+$/);
  return m ? m[0] : null;
}

async function findManifest(
  root: string,
): Promise<{ manifest: ParsedManifest; basePath: string } | null> {
  // 1. Direct at root
  for (const name of ['plugin.json', 'game.json', 'arena.json', 'manifest.json']) {
    const p = join(root, name);
    if (existsSync(p)) {
      const buf = await readFile(p);
      const manifest = parseManifestFromBuffer(buf);
      if (manifest) return { manifest, basePath: root };
    }
  }
  // 2. Single subdirectory
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    if (dirs.length === 1) {
      const subDir = dirs[0];
      if (subDir) {
        const sub = join(root, subDir.name);
        for (const name of ['plugin.json', 'game.json', 'arena.json', 'manifest.json']) {
          const p = join(sub, name);
          if (existsSync(p)) {
            const buf = await readFile(p);
            const manifest = parseManifestFromBuffer(buf);
            if (manifest) return { manifest, basePath: sub };
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function copyTree(src: string, dest: string): Promise<void> {
  mkdirSync(dest, { recursive: true });
  await cp(src, dest, { recursive: true });
}
async function findHtmlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === '__MACOSX' || entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await findHtmlFiles(fullPath);
      results.push(...subResults);
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
      results.push(fullPath);
    }
  }
  return results;
}
