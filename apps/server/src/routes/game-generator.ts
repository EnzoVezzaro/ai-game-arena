import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
import { SqliteStorage } from '@ai-game-arena/storage';
import { resolveApiKey, decryptApiKey } from '@ai-game-arena/ai-runtime';
import type { ProviderConfig } from '@ai-game-arena/sdk';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ReadableStream } from 'stream/web';

/**
 * "Create a Game" — a ChatGPT-style section that drives an LLM agent which
 * generates a workable single-file HTML5 game. The result can be installed
 * into `games/<slug>/` (becomes runnable via the existing HTML bridge) and
 * published to the marketplace (existing /artifacts/:id/publish route).
 *
 * Two endpoints:
 *   POST /chat          — streaming chat completion (SSE-style chunked text)
 *   POST /save          — persist the generated HTML as a new game artifact
 */

export interface GameGenMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GameGenProvider {
  type: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

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

const SYSTEM_PROMPT = `You are a senior HTML5 game developer agent inside the AI Game Arena.
Your job: design and produce COMPLETE, playable, self-contained single-file HTML5 games.

Hard rules for every game you produce:
- Output exactly ONE \`<!DOCTYPE html>…</html>\` document inside a single fenced \`\`\`html code block.
- Everything (HTML, CSS, JavaScript) must live in that one file. No external scripts, no CDN assets, no fetch calls. Pure vanilla JS + Canvas or DOM only.
- The game must be actually playable: title screen or direct play, win/lose/restart, score, and clear controls (keyboard and/or mouse). Document the controls in a short on-screen hint.
- Keep it lightweight and dependency-free so it runs offline in an iframe.
- Use a 16:9 canvas sized to fit, with crisp visuals and responsive layout.
- Never emit partial files, placeholders, TODOs, or "rest of code omitted". Ship the full game.

Before writing code, think briefly (2–4 short sentences) about the core loop and controls, then deliver the complete game in the fenced html block. After the block, add one short line describing how to play.`;


function sanitizeSlug(name: string, fallback: string): string {
  const slug =
    (name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || fallback;
  return slug;
}

export function createGameGeneratorRoutes(container: Container, projectRoot: string) {
  const app = new Hono();
  const storage = container.resolve<SqliteStorage>('storage');
  const gamesDir = join(projectRoot, 'games');

  // ---- Streaming chat ----
  // Body: { provider, messages }
  // Streams assistant tokens as plain text chunks (no SSE framing, so the
  // browser can incremental-decode the body).
  app.post('/chat', async (c) => {
    const body = await c.req.json<{
      provider: GameGenProvider;
      messages: GameGenMessage[];
    }>();

    const provider = body.provider;
    if (!provider?.type || !provider?.baseUrl || !provider?.model) {
      return c.json({ error: 'provider.type, provider.baseUrl and provider.model are required' }, 400);
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return c.json({ error: 'messages must be a non-empty array' }, 400);
    }

    const pc = provider as unknown as ProviderConfig;
    const apiKey = decryptApiKey(resolveApiKey(provider.type, undefined, pc) ?? '');
    const base = provider.baseUrl.replace(/\/$/, '');

    const upstream = buildUpstreamRequest(provider.type, base, apiKey, provider.model, messages);
    if (!upstream) {
      return c.json({ error: `Unsupported provider type: ${provider.type}` }, 400);
    }

    const res = await fetch(upstream.url, upstream.init);
    if (!res.ok || !res.body) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
      return c.json({ error: `Provider returned ${res.status}: ${detail}` }, 502);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await pumpChunks(provider.type, res.body!, (delta) => {
            controller.enqueue(new TextEncoder().encode(delta));
          });
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });

  // ---- Save generated game ----
  // Body: { name, description, html, min_players, max_players }
  // Writes games/<slug>/index.html + game.json and inserts an artifact row
  // with status 'installed' so it is immediately runnable + publishable.
  app.post('/save', async (c) => {
    const body = await c.req.json<{
      name: string;
      description?: string;
      html: string;
      min_players?: number;
      max_players?: number;
    }>();

    const name = (body.name || '').trim();
    const html = (body.html || '').trim();
    if (!name) return c.json({ error: 'name is required' }, 400);
    if (!html) return c.json({ error: 'html is required' }, 400);
    if (!/<!DOCTYPE html>/i.test(html)) {
      return c.json({ error: 'html must be a complete <!DOCTYPE html> document' }, 400);
    }

    const baseSlug = sanitizeSlug(name, `game-${randomUUID().slice(0, 8)}`);
    let slug = baseSlug;
    // De-duplicate slug against existing artifacts + filesystem.
    const dup = await storage.getOne<{ id: string }>(
      'SELECT id FROM artifacts WHERE type = ? AND slug = ?',
      ['game', slug],
    );
    if (dup || existsSync(join(gamesDir, slug))) {
      slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
    }

    const persistDir = join(gamesDir, slug);
    if (existsSync(persistDir)) await rm(persistDir, { recursive: true, force: true });
    mkdirSync(persistDir, { recursive: true });

    const manifest = {
      id: slug,
      name,
      description: body.description ?? `Generated by AI Game Arena`,
      version: '1.0.0',
      category: 'game',
      format: 'html',
      adapterType: 'web',
      min_players: body.min_players ?? 1,
      max_players: body.max_players ?? 1,
      entry: 'index.html',
    };

    await writeFile(join(persistDir, 'index.html'), html, 'utf-8');
    await writeFile(join(persistDir, 'game.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    const id = randomUUID();
    const now = Date.now();
    await storage.run(
      `INSERT INTO artifacts (id, type, slug, name, version, manifest, status, path, description, published_at, published_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      [
        id,
        'game',
        slug,
        name,
        '1.0.0',
        JSON.stringify(manifest),
        'installed',
        persistDir,
        manifest.description,
        now,
        now,
      ],
    );

    const row = await storage.getOne<ArtifactRow>('SELECT * FROM artifacts WHERE id = ?', [id]);
    return c.json(rowToArtifact(row!), 201);
  });

  function rowToArtifact(r: ArtifactRow) {
    return {
      id: r.id,
      type: r.type,
      slug: r.slug,
      name: r.name,
      version: r.version,
      description: r.description,
      manifest: JSON.parse(r.manifest),
      status: r.status,
      path: r.path,
      published: r.published_at !== null,
      published_at: r.published_at,
      published_by: r.published_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      playUrl: `/games/${r.slug}/index.html`,
    };
  }

  return app;
}

// ---------------------------------------------------------------------------
// Provider-specific upstream request + stream parsers
// ---------------------------------------------------------------------------

function buildUpstreamRequest(
  type: string,
  base: string,
  apiKey: string,
  model: string,
  messages: GameGenMessage[],
): { url: string; init: RequestInit } | null {
  const sysMessages = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages];

  if (type === 'ollama') {
    return {
      url: `${base}/api/chat`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: sysMessages, stream: true }),
      },
    };
  }

  if (type === 'anthropic') {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (apiKey) headers['x-api-key'] = apiKey;
    // Anthropic takes system separately; strip our injected first message.
    const userMessages = sysMessages.slice(1).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    return {
      url: `${base}/v1/messages`,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          messages: userMessages,
          stream: true,
        }),
      },
    };
  }

  if (type === 'google') {
    const keyParam = apiKey ? `?key=${apiKey}` : '';
    return {
      url: `${base}/v1beta/models/${model}:streamGenerateContent${keyParam}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
      },
    };
  }

  // OpenAI-compatible: openai, mistral, groq, openrouter, lmstudio, vllm, nvidia, custom
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return {
    url: `${base}/chat/completions`,
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: sysMessages,
        stream: true,
        temperature: 0.7,
      }),
    },
  };
}

async function pumpChunks(
  type: string,
  body: ReadableStream<Uint8Array>,
  emit: (delta: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitOpenAI = (obj: Record<string, unknown>) => {
    const choices = obj.choices as Array<{ delta?: { content?: string } }> | undefined;
    const delta = choices?.[0]?.delta?.content;
    if (delta) emit(delta);
  };
  const emitAnthropic = (obj: Record<string, unknown>) => {
    if (obj.type === 'content_block_delta') {
      const delta = obj.delta as { text?: string } | undefined;
      if (delta?.text) emit(delta.text);
    }
  };
  const emitGoogle = (obj: Record<string, unknown>) => {
    const candidates = obj.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
    const text = candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) emit(text);
  };

  // Google returns a single JSON array of chunk objects (or one object);
  // accumulate the whole body, then iterate every element.
  if (type === 'google') {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const parsed = JSON.parse(buffer) as unknown;
      const chunks = Array.isArray(parsed) ? parsed : [parsed];
      for (const chunk of chunks) {
        if (chunk && typeof chunk === 'object') emitGoogle(chunk as Record<string, unknown>);
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Anthropic + OpenAI + Ollama are all newline-delimited, optionally
      // with an SSE `data: ` prefix. Anthropic delimits messages with
      // `event: <type>\ndata: <json>\n\n`; the `event:` lines carry no JSON
      // and are skipped by the parser.
      let nlIdx: number;
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, nlIdx).trim();
        buffer = buffer.slice(nlIdx + 1);
        if (!line) continue;

        if (type === 'ollama') {
          const json = parseJsonLoose(line);
          if (json && typeof json === 'object') {
            const msg = (json as { message?: { content?: string } }).message;
            if (msg?.content) emit(msg.content);
          }
          continue;
        }

        // SSE: `data: <payload>`; OpenAI terminates with `data: [DONE]`.
        if (line.startsWith('data:')) line = line.slice(5).trim();
        if (line.startsWith('event:')) continue; // Anthropic event markers carry no payload
        if (line === '[DONE]') return;
        if (!line) continue;
        const json = parseJsonLoose(line);
        if (!json || typeof json !== 'object') continue;
        if (type === 'anthropic') emitAnthropic(json as Record<string, unknown>);
        else emitOpenAI(json as Record<string, unknown>);
      }
    }
  } finally {
    reader.releaseLock();
  }
}


function parseJsonLoose(s: string): unknown | null {
  // Strip Anthropic SSE `data:` prefix if present.
  const trimmed = s.replace(/^data:\s*/, '').trim();
  if (!trimmed || trimmed === '[DONE]') return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
