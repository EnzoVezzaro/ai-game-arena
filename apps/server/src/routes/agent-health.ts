import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import { SqliteStorage } from '@ai-game-arena/storage';
import type { AgentConfig } from '@ai-game-arena/sdk';

export function createAgentHealthRoutes(container: Container) {
  const app = new Hono();
  const storage = container.resolve<SqliteStorage>('storage');

  app.post('/health', async (c) => {
    const { agentIds } = await c.req.json<{ agentIds: string[] }>();

    if (!agentIds || agentIds.length === 0) {
      return c.json({ error: 'agentIds is required', ok: false }, 400);
    }

    const results: Array<{
      agentId: string;
      ok: boolean;
      error?: string;
      providerType?: string;
      response?: string;
    }> = [];

    for (const agentId of agentIds) {
      try {
        const stored = await storage.getOne<{ id: string; name: string; config: string }>(
          'SELECT * FROM agents WHERE id = ?',
          [agentId],
        );

        if (!stored) {
          results.push({ agentId, ok: false, error: 'Agent not found', providerType: undefined });
          continue;
        }

        const config = JSON.parse(stored.config) as AgentConfig;
        const provider = config.provider;
        if (!provider || typeof provider === 'string') {
          results.push({
            agentId,
            ok: true,
            providerType: typeof provider === 'string' ? provider : undefined,
          });
          continue;
        }

        const providerType = provider.type;
        const baseUrl = provider.baseUrl;
        const apiKey = provider.apiKey;
        const model = provider.model;

        if (!baseUrl) {
          results.push({ agentId, ok: false, error: 'No baseUrl configured', providerType });
          continue;
        }

        const resolvedApiKey = apiKey;
        const resolvedBaseUrl = baseUrl.replace(/\/$/, '');

        if (providerType === 'ollama') {
          const res = await fetch(`${resolvedBaseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt: 'hi', options: { num_predict: 1 } }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            results.push({
              agentId,
              ok: false,
              error: `Ollama returned ${res.status}: ${body.slice(0, 200)}`,
              providerType,
            });
            continue;
          }
          const data = (await res.json()) as { response?: string };
          results.push({ agentId, ok: true, providerType, response: data.response?.slice(0, 100) });
          continue;
        }

        if (providerType === 'anthropic') {
          const headers: Record<string, string> = { 'anthropic-version': '2023-06-01' };
          if (resolvedApiKey) headers['x-api-key'] = resolvedApiKey;
          const res = await fetch(`${resolvedBaseUrl}/v1/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model,
              max_tokens: 1,
              messages: [{ role: 'user', content: 'hi' }],
            }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            results.push({
              agentId,
              ok: false,
              error: `Anthropic returned ${res.status}: ${body.slice(0, 200)}`,
              providerType,
            });
            continue;
          }
          const data = (await res.json()) as { content?: Array<{ text?: string }> };
          const text = data.content?.map((c) => c.text ?? '').join('').slice(0, 100);
          results.push({ agentId, ok: true, providerType, response: text });
          continue;
        }

        if (providerType === 'google') {
          const keyParam = resolvedApiKey ? `?key=${resolvedApiKey}` : '';
          const res = await fetch(
            `${resolvedBaseUrl}/v1beta/models/${model}:generateContent${keyParam}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
                generationConfig: { maxOutputTokens: 1 },
              }),
            },
          );
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            results.push({
              agentId,
              ok: false,
              error: `Google returned ${res.status}: ${body.slice(0, 200)}`,
              providerType,
            });
            continue;
          }
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').slice(0, 100);
          results.push({ agentId, ok: true, providerType, response: text });
          continue;
        }

        // OpenAI-compatible (openai, lmstudio, vllm, mistral, groq, openrouter, custom)
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (resolvedApiKey) headers['Authorization'] = `Bearer ${resolvedApiKey}`;
        const res = await fetch(`${resolvedBaseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            max_tokens: 1,
            temperature: 0,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          results.push({
            agentId,
            ok: false,
            error: `${providerType} returned ${res.status}: ${body.slice(0, 200)}`,
            providerType,
          });
          continue;
        }
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.slice(0, 100);
        results.push({ agentId, ok: true, providerType, response: text });
      } catch (err) {
        results.push({ agentId, ok: false, error: (err as Error).message, providerType: undefined });
      }
    }

    const allOk = results.every((r) => r.ok);
    return c.json({ ok: allOk, results });
  });

  return app;
}