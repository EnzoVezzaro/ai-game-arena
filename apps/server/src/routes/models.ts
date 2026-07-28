import { Hono } from 'hono';

export function createModelsRoutes() {
  const app = new Hono();

  app.post('/fetch', async (c) => {
    const { type, baseUrl, apiKey } = await c.req.json<{
      type: string;
      baseUrl: string;
      apiKey?: string;
    }>();

    if (!type || !baseUrl) {
      return c.json({ error: 'type and baseUrl are required' }, 400);
    }

    try {
      let modelIds: string[] = [];
      const base = baseUrl.replace(/\/$/, '');

      if (type === 'ollama') {
        const res = await fetch(`${base}/api/tags`);
        if (!res.ok) {
          return c.json({ error: `Ollama returned ${res.status}`, models: [] });
        }
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        modelIds = (data.models ?? []).map((m) => m.name);
      } else if (type === 'anthropic') {
        const headers: Record<string, string> = {
          'anthropic-version': '2023-06-01',
        };
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        }
        const res = await fetch(`${base}/v1/models`, { headers });
        if (!res.ok) {
          return c.json({ error: `Anthropic returned ${res.status}`, models: [] });
        }
        const data = (await res.json()) as { data?: Array<{ id: string }> };
        modelIds = (data.data ?? []).map((m) => m.id);
      } else if (type === 'google') {
        const keyParam = apiKey ? `?key=${apiKey}` : '';
        const res = await fetch(`${base}/v1beta/models${keyParam}`);
        if (!res.ok) {
          return c.json({ error: `Google returned ${res.status}`, models: [] });
        }
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        modelIds = (data.models ?? []).map((m) => m.name.replace('models/', ''));
      } else {
        // OpenAI-compatible (openai, lmstudio, vllm, mistral, groq, openrouter, custom)
        const headers: Record<string, string> = {};
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        const res = await fetch(`${base}/models`, { headers });
        if (!res.ok) {
          return c.json({ error: `Provider returned ${res.status}`, models: [] });
        }
        const data = (await res.json()) as {
          data?: Array<{ id: string }>;
        };
        modelIds = (data.data ?? []).map((m) => m.id);
      }

      return c.json({ models: modelIds });
    } catch (err) {
      return c.json({ error: (err as Error).message, models: [] });
    }
  });

  return app;
}
